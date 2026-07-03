import { eq } from 'drizzle-orm';
import type {
  Championship,
  ChampionshipFormat,
  ChampionshipRepository,
  ChampionshipStatus,
  ChampionshipTeam,
  Match,
  MatchSet,
  MatchStatus,
} from '@scrimmage/core';
import type { Db } from '../client.js';
import { championshipTeams, championships, matchSets, matches } from '../schema.js';

type ChampionshipRow = typeof championships.$inferSelect;
type MatchRow = typeof matches.$inferSelect;

function toChampionship(row: ChampionshipRow): Championship {
  return {
    id: row.id,
    guildId: row.guildId,
    name: row.name,
    format: row.format as ChampionshipFormat,
    bestOf: row.bestOf,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status as ChampionshipStatus,
    createdAt: row.createdAt,
  };
}

function toMatch(row: MatchRow): Match {
  return {
    id: row.id,
    championshipId: row.championshipId,
    round: row.round,
    position: row.position,
    homeTeamId: row.homeTeamId,
    awayTeamId: row.awayTeamId,
    winnerTeamId: row.winnerTeamId,
    status: row.status as MatchStatus,
    nextMatchId: row.nextMatchId,
    createdAt: row.createdAt,
  };
}

export class DrizzleChampionshipRepository implements ChampionshipRepository {
  constructor(private readonly db: Db) {}

  async create(championship: Championship): Promise<Championship> {
    this.db.insert(championships).values(championship).run();
    return championship;
  }

  async find(id: string): Promise<Championship | null> {
    const row = this.db.select().from(championships).where(eq(championships.id, id)).get();
    return row ? toChampionship(row) : null;
  }

  async list(guildId: string): Promise<Championship[]> {
    return this.db
      .select()
      .from(championships)
      .where(eq(championships.guildId, guildId))
      .all()
      .map(toChampionship);
  }

  async update(championship: Championship): Promise<Championship> {
    this.db
      .update(championships)
      .set({
        name: championship.name,
        bestOf: championship.bestOf,
        startsAt: championship.startsAt,
        endsAt: championship.endsAt,
        status: championship.status,
      })
      .where(eq(championships.id, championship.id))
      .run();
    return championship;
  }

  async setTeams(championshipId: string, teams: ChampionshipTeam[]): Promise<void> {
    this.db
      .delete(championshipTeams)
      .where(eq(championshipTeams.championshipId, championshipId))
      .run();
    if (teams.length > 0) {
      this.db.insert(championshipTeams).values(teams).run();
    }
  }

  async listTeams(championshipId: string): Promise<ChampionshipTeam[]> {
    return this.db
      .select()
      .from(championshipTeams)
      .where(eq(championshipTeams.championshipId, championshipId))
      .all();
  }

  async createMatches(list: Match[]): Promise<void> {
    if (list.length > 0) {
      this.db.insert(matches).values(list).run();
    }
  }

  async findMatch(id: string): Promise<Match | null> {
    const row = this.db.select().from(matches).where(eq(matches.id, id)).get();
    return row ? toMatch(row) : null;
  }

  async listMatches(championshipId: string): Promise<Match[]> {
    return this.db
      .select()
      .from(matches)
      .where(eq(matches.championshipId, championshipId))
      .all()
      .map(toMatch);
  }

  async updateMatch(match: Match): Promise<Match> {
    this.db
      .update(matches)
      .set({
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        winnerTeamId: match.winnerTeamId,
        status: match.status,
      })
      .where(eq(matches.id, match.id))
      .run();
    return match;
  }

  async setMatchSets(matchId: string, sets: MatchSet[]): Promise<void> {
    this.db.delete(matchSets).where(eq(matchSets.matchId, matchId)).run();
    if (sets.length > 0) {
      this.db.insert(matchSets).values(sets).run();
    }
  }

  async listMatchSets(matchId: string): Promise<MatchSet[]> {
    return this.db.select().from(matchSets).where(eq(matchSets.matchId, matchId)).all();
  }
}
