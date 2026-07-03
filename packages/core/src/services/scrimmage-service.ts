import { z } from 'zod';
import type { Scrimmage, ScrimmageResult } from '../domain/scrimmage.js';
import { ScrimmageStatus } from '../domain/scrimmage.js';
import type {
  ScrimmageFilter,
  ScrimmageRepository,
  TeamRepository,
} from '../storage/repositories.js';
import { InvalidStateError, NotFoundError, ValidationError } from '../errors/index.js';
import { resolveRuntime, type ServiceRuntime } from '../runtime.js';
import { parse } from '../validation.js';

const proposeSchema = z.object({
  guildId: z.string().min(1),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  scheduledAt: z.date(),
  proposedBy: z.string().min(1),
  channelId: z.string().optional(),
});

export type ProposeScrimmageInput = z.infer<typeof proposeSchema>;

const resultSchema = z.object({
  homeScore: z.number().int().min(0).max(999),
  awayScore: z.number().int().min(0).max(999),
});

export type RecordResultInput = z.infer<typeof resultSchema>;

/**
 * Application service that owns the scrimmage lifecycle (propose → confirm →
 * played / cancelled) and the rules that guard each transition.
 */
export class ScrimmageService {
  private readonly runtime: ServiceRuntime;

  constructor(
    private readonly scrimmages: ScrimmageRepository,
    private readonly teams: TeamRepository,
    runtime?: Partial<ServiceRuntime>,
  ) {
    this.runtime = resolveRuntime(runtime);
  }

  /** Propose a friendly match between two distinct teams of the same guild. */
  async propose(input: ProposeScrimmageInput): Promise<Scrimmage> {
    const data = parse(proposeSchema, input);

    if (data.homeTeamId === data.awayTeamId) {
      throw new ValidationError('A team cannot scrim against itself.');
    }
    if (data.scheduledAt.getTime() <= this.runtime.now().getTime()) {
      throw new ValidationError('The match must be scheduled in the future.');
    }

    const [home, away] = await Promise.all([
      this.teams.findById(data.guildId, data.homeTeamId),
      this.teams.findById(data.guildId, data.awayTeamId),
    ]);
    if (!home) {
      throw new NotFoundError('Home team not found.');
    }
    if (!away) {
      throw new NotFoundError('Away team not found.');
    }

    const scrimmage: Scrimmage = {
      id: this.runtime.generateId(),
      guildId: data.guildId,
      homeTeamId: data.homeTeamId,
      awayTeamId: data.awayTeamId,
      scheduledAt: data.scheduledAt,
      status: ScrimmageStatus.Proposed,
      result: null,
      proposedBy: data.proposedBy,
      channelId: data.channelId ?? null,
      reminderSentAt: null,
      createdAt: this.runtime.now(),
    };
    const created = await this.scrimmages.create(scrimmage);
    this.runtime.events.emit('scrimmage.proposed', { scrimmage: created });
    return created;
  }

  async getScrimmage(guildId: string, id: string): Promise<Scrimmage> {
    const scrimmage = await this.scrimmages.findById(guildId, id);
    if (!scrimmage) {
      throw new NotFoundError('Scrimmage not found.');
    }
    return scrimmage;
  }

  list(guildId: string, filter?: ScrimmageFilter): Promise<Scrimmage[]> {
    return this.scrimmages.list(guildId, filter);
  }

  /** Move a proposed scrimmage to confirmed. */
  async confirm(guildId: string, id: string): Promise<Scrimmage> {
    const scrimmage = await this.getScrimmage(guildId, id);
    if (scrimmage.status !== ScrimmageStatus.Proposed) {
      throw new InvalidStateError(
        `Only proposed scrimmages can be confirmed (current status: ${scrimmage.status}).`,
      );
    }
    const updated = await this.scrimmages.update({
      ...scrimmage,
      status: ScrimmageStatus.Confirmed,
    });
    this.runtime.events.emit('scrimmage.confirmed', { scrimmage: updated });
    return updated;
  }

  /** Cancel a scrimmage that has not been played yet. */
  async cancel(guildId: string, id: string): Promise<Scrimmage> {
    const scrimmage = await this.getScrimmage(guildId, id);
    if (scrimmage.status === ScrimmageStatus.Played) {
      throw new InvalidStateError('A played scrimmage cannot be cancelled.');
    }
    if (scrimmage.status === ScrimmageStatus.Cancelled) {
      throw new InvalidStateError('This scrimmage is already cancelled.');
    }
    const updated = await this.scrimmages.update({
      ...scrimmage,
      status: ScrimmageStatus.Cancelled,
    });
    this.runtime.events.emit('scrimmage.cancelled', { scrimmage: updated });
    return updated;
  }

  /** Record the final score, moving a confirmed scrimmage to played. */
  async recordResult(guildId: string, id: string, input: RecordResultInput): Promise<Scrimmage> {
    const result: ScrimmageResult = parse(resultSchema, input);
    const scrimmage = await this.getScrimmage(guildId, id);
    if (scrimmage.status !== ScrimmageStatus.Confirmed) {
      throw new InvalidStateError(
        `Only confirmed scrimmages can have a result recorded (current status: ${scrimmage.status}).`,
      );
    }
    const played = await this.scrimmages.update({
      ...scrimmage,
      status: ScrimmageStatus.Played,
      result,
    });
    this.runtime.events.emit('scrimmage.played', { scrimmage: played });
    return played;
  }

  /**
   * Mark every confirmed scrimmage whose kickoff is within `withinMs` as reminded
   * and emit `scrimmage.reminderDue` for the upcoming ones. Designed to be polled
   * (e.g. once a minute) so it survives restarts — it reads state from storage
   * each time rather than relying on in-memory timers.
   */
  async processDueReminders(
    windowMs: number,
    resolveLeadMs: (guildId: string) => number | Promise<number> = () => windowMs,
  ): Promise<Scrimmage[]> {
    const now = this.runtime.now();
    const before = new Date(now.getTime() + windowMs);
    const candidates = await this.scrimmages.listDueReminders(before);

    const reminded: Scrimmage[] = [];
    for (const scrimmage of candidates) {
      const msUntil = scrimmage.scheduledAt.getTime() - now.getTime();
      if (msUntil <= 0) {
        // Kickoff already passed — mark it so it stops being re-queried; don't announce.
        await this.scrimmages.update({ ...scrimmage, reminderSentAt: now });
        continue;
      }
      const lead = await resolveLeadMs(scrimmage.guildId);
      if (msUntil <= lead) {
        const updated = await this.scrimmages.update({ ...scrimmage, reminderSentAt: now });
        this.runtime.events.emit('scrimmage.reminderDue', { scrimmage: updated });
        reminded.push(updated);
      }
      // else: not yet within its guild's lead — leave it for a later tick.
    }
    return reminded;
  }
}
