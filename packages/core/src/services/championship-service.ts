import { z } from 'zod';
import {
  ChampionshipFormat,
  ChampionshipStatus,
  MatchStatus,
  setsToWin,
  type Championship,
  type ChampionshipTeam,
  type Match,
  type MatchSet,
} from '../domain/championship.js';
import type { ChampionshipRepository } from '../storage/repositories.js';
import { InvalidStateError, NotFoundError, ValidationError } from '../errors/index.js';
import { resolveRuntime, type ServiceRuntime } from '../runtime.js';
import { parse } from '../validation.js';
import { buildBracket } from './bracket.js';

const nameSchema = z.string().trim().min(1).max(100);
const bestOfSchema = z
  .number()
  .int()
  .refine((value) => value === 3 || value === 5, 'Best-of must be 3 or 5.');

/** Input for creating a championship. */
export interface CreateChampionshipInput {
  readonly name: string;
  readonly bestOf: number;
  readonly startsAt: Date;
  readonly endsAt: Date;
}

/** A single set's score when recording a match result. */
export interface RecordSetInput {
  readonly homeScore: number;
  readonly awayScore: number;
}

/** A match together with its recorded sets. */
export interface MatchWithSets {
  readonly match: Match;
  readonly sets: MatchSet[];
}

function validateSets(sets: RecordSetInput[], bestOf: number): { homeWon: boolean } {
  const need = setsToWin(bestOf);
  if (sets.length < need || sets.length > bestOf) {
    throw new ValidationError(
      `A best-of-${bestOf} match needs between ${need} and ${bestOf} sets.`,
    );
  }
  let homeSets = 0;
  let awaySets = 0;
  for (const set of sets) {
    if (
      !Number.isInteger(set.homeScore) ||
      !Number.isInteger(set.awayScore) ||
      set.homeScore < 0 ||
      set.awayScore < 0
    ) {
      throw new ValidationError('Set scores must be non-negative whole numbers.');
    }
    if (set.homeScore === set.awayScore) {
      throw new ValidationError('A set cannot end in a tie.');
    }
    if (set.homeScore > set.awayScore) {
      homeSets += 1;
    } else {
      awaySets += 1;
    }
  }
  if (Math.max(homeSets, awaySets) !== need) {
    throw new ValidationError(`The winner must take exactly ${need} sets.`);
  }
  return { homeWon: homeSets > awaySets };
}

/** Creates and runs single-elimination volleyball championships. */
export class ChampionshipService {
  private readonly runtime: ServiceRuntime;

  constructor(
    private readonly repo: ChampionshipRepository,
    runtime?: Partial<ServiceRuntime>,
  ) {
    this.runtime = resolveRuntime(runtime);
  }

  async createChampionship(guildId: string, input: CreateChampionshipInput): Promise<Championship> {
    const name = parse(nameSchema, input.name);
    const bestOf = parse(bestOfSchema, input.bestOf);
    if (input.endsAt.getTime() < input.startsAt.getTime()) {
      throw new ValidationError('The end date must not be before the start date.');
    }
    const championship: Championship = {
      id: this.runtime.generateId(),
      guildId,
      name,
      format: ChampionshipFormat.SingleElimination,
      bestOf,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: ChampionshipStatus.Draft,
      createdAt: this.runtime.now(),
    };
    return this.repo.create(championship);
  }

  listChampionships(guildId: string): Promise<Championship[]> {
    return this.repo.list(guildId);
  }

  async getChampionship(guildId: string, id: string): Promise<Championship> {
    const championship = await this.repo.find(id);
    if (!championship || championship.guildId !== guildId) {
      throw new NotFoundError('Championship not found.');
    }
    return championship;
  }

  /** Set (and re-seed) the teams entered into a draft championship, in seed order. */
  async setTeams(
    guildId: string,
    championshipId: string,
    teamIds: string[],
  ): Promise<ChampionshipTeam[]> {
    const championship = await this.getChampionship(guildId, championshipId);
    if (championship.status !== ChampionshipStatus.Draft) {
      throw new InvalidStateError('Teams can only be changed while the championship is a draft.');
    }
    const unique = [...new Set(teamIds)];
    if (unique.length !== teamIds.length) {
      throw new ValidationError('A team cannot be entered twice.');
    }
    const teams: ChampionshipTeam[] = teamIds.map((teamId, index) => ({
      championshipId,
      teamId,
      seed: index + 1,
    }));
    await this.repo.setTeams(championshipId, teams);
    return teams;
  }

  listTeams(championshipId: string): Promise<ChampionshipTeam[]> {
    return this.repo.listTeams(championshipId);
  }

  /** Draw the bracket from the seeded teams and open the championship for play. */
  async generateBracket(guildId: string, championshipId: string): Promise<Championship> {
    const championship = await this.getChampionship(guildId, championshipId);
    if (championship.status !== ChampionshipStatus.Draft) {
      throw new InvalidStateError('The bracket has already been drawn.');
    }
    const teams = (await this.repo.listTeams(championshipId)).sort((a, b) => a.seed - b.seed);
    if (teams.length < 2) {
      throw new ValidationError('Add at least two teams before drawing the bracket.');
    }

    const specs = buildBracket(teams.map((team) => team.teamId));
    const totalRounds = Math.max(...specs.map((spec) => spec.round));
    const now = this.runtime.now();
    const idByPosition = new Map<string, string>();
    const key = (round: number, position: number): string => `${round}:${position}`;
    for (const spec of specs) {
      idByPosition.set(key(spec.round, spec.position), this.runtime.generateId());
    }

    const matches: Match[] = specs.map((spec) => ({
      id: idByPosition.get(key(spec.round, spec.position)) as string,
      championshipId,
      round: spec.round,
      position: spec.position,
      homeTeamId: spec.homeTeamId,
      awayTeamId: spec.awayTeamId,
      winnerTeamId: spec.winnerTeamId,
      status: spec.winnerTeamId ? MatchStatus.Played : MatchStatus.Pending,
      nextMatchId:
        spec.round < totalRounds
          ? (idByPosition.get(key(spec.round + 1, Math.floor(spec.position / 2))) as string)
          : null,
      createdAt: now,
    }));

    await this.repo.createMatches(matches);
    return this.repo.update({ ...championship, status: ChampionshipStatus.Active });
  }

  listMatches(championshipId: string): Promise<Match[]> {
    return this.repo.listMatches(championshipId);
  }

  async getMatch(matchId: string): Promise<MatchWithSets> {
    const match = await this.repo.findMatch(matchId);
    if (!match) {
      throw new NotFoundError('Match not found.');
    }
    return { match, sets: await this.repo.listMatchSets(matchId) };
  }

  /** Record a match's set scores, decide the winner and advance the bracket. */
  async recordSets(guildId: string, matchId: string, sets: RecordSetInput[]): Promise<Match> {
    const match = await this.repo.findMatch(matchId);
    if (!match) {
      throw new NotFoundError('Match not found.');
    }
    const championship = await this.getChampionship(guildId, match.championshipId);
    if (match.status === MatchStatus.Played) {
      throw new InvalidStateError('This match already has a result.');
    }
    if (!match.homeTeamId || !match.awayTeamId) {
      throw new InvalidStateError('Both teams must be decided before recording a result.');
    }

    const { homeWon } = validateSets(sets, championship.bestOf);
    const winnerTeamId = homeWon ? match.homeTeamId : match.awayTeamId;
    await this.repo.setMatchSets(
      matchId,
      sets.map((set, index) => ({
        matchId,
        setNumber: index + 1,
        homeScore: set.homeScore,
        awayScore: set.awayScore,
      })),
    );
    const played = await this.repo.updateMatch({
      ...match,
      winnerTeamId,
      status: MatchStatus.Played,
    });

    if (match.nextMatchId) {
      const next = await this.repo.findMatch(match.nextMatchId);
      if (next) {
        const intoHome = match.position % 2 === 0;
        await this.repo.updateMatch({
          ...next,
          homeTeamId: intoHome ? winnerTeamId : next.homeTeamId,
          awayTeamId: intoHome ? next.awayTeamId : winnerTeamId,
        });
      }
    } else {
      await this.repo.update({ ...championship, status: ChampionshipStatus.Completed });
    }

    return played;
  }
}
