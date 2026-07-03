import type { BotPresenceRepository } from '../storage/repositories.js';
import { resolveRuntime, type ServiceRuntime } from '../runtime.js';

/** How long after its last heartbeat the bot is considered offline (ms). */
export const DEFAULT_PRESENCE_TTL_MS = 90_000;

/** Whether the bot is currently connected to a guild, and when it was last seen. */
export interface BotStatus {
  readonly online: boolean;
  readonly lastSeenAt: Date | null;
}

/**
 * Tracks the bot's liveness per guild via periodic heartbeats. The bot writes
 * heartbeats; the API reads them so the dashboard can show whether the bot is
 * online in a given server.
 */
export class BotStatusService {
  private readonly runtime: ServiceRuntime;

  constructor(
    private readonly presence: BotPresenceRepository,
    runtime?: Partial<ServiceRuntime>,
  ) {
    this.runtime = resolveRuntime(runtime);
  }

  /** Record that the bot is connected to each of these guilds, right now. */
  recordHeartbeat(guildIds: string[]): Promise<void> {
    return this.presence.heartbeat(guildIds, this.runtime.now());
  }

  /** Current online status for a guild. */
  async statusFor(guildId: string, ttlMs: number = DEFAULT_PRESENCE_TTL_MS): Promise<BotStatus> {
    const presence = await this.presence.get(guildId);
    if (!presence) {
      return { online: false, lastSeenAt: null };
    }
    const online = this.runtime.now().getTime() - presence.lastSeenAt.getTime() <= ttlMs;
    return { online, lastSeenAt: presence.lastSeenAt };
  }
}
