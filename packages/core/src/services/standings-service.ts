import { ScrimmageStatus, type Scrimmage } from '../domain/scrimmage.js';
import type { PointsConfig } from '../domain/guild-settings.js';
import type { TeamStanding } from '../domain/standing.js';
import type { ScrimmageRepository } from '../storage/repositories.js';
import type { GuildSettingsService } from './guild-settings-service.js';

const DEFAULT_POINTS: PointsConfig = { win: 3, draw: 1, loss: 0 };

interface Tally {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

/** An all-zero standing, for teams that have not played yet. */
export function emptyStanding(teamId: string): TeamStanding {
  return {
    teamId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };
}

/**
 * Compute a league table from played scrimmages. Pure and side-effect free, so
 * it is trivial to test and reuse. Sorted by points, then goal difference, then
 * goals scored.
 */
export function buildStandings(
  scrimmages: Scrimmage[],
  points: PointsConfig = DEFAULT_POINTS,
): TeamStanding[] {
  const table = new Map<string, Tally>();
  const tally = (teamId: string): Tally => {
    let entry = table.get(teamId);
    if (!entry) {
      entry = { teamId, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
      table.set(teamId, entry);
    }
    return entry;
  };

  for (const scrimmage of scrimmages) {
    if (scrimmage.status !== ScrimmageStatus.Played || !scrimmage.result) {
      continue;
    }
    const home = tally(scrimmage.homeTeamId);
    const away = tally(scrimmage.awayTeamId);
    const { homeScore, awayScore } = scrimmage.result;

    home.played += 1;
    away.played += 1;
    home.goalsFor += homeScore;
    home.goalsAgainst += awayScore;
    away.goalsFor += awayScore;
    away.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.wins += 1;
      away.losses += 1;
    } else if (homeScore < awayScore) {
      away.wins += 1;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
    }
  }

  return [...table.values()]
    .map((entry) => ({
      ...entry,
      goalDifference: entry.goalsFor - entry.goalsAgainst,
      points: entry.wins * points.win + entry.draws * points.draw + entry.losses * points.loss,
    }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.teamId.localeCompare(b.teamId),
    );
}

/** Read model that turns played scrimmages into league standings. */
export class StandingsService {
  constructor(
    private readonly scrimmages: ScrimmageRepository,
    private readonly settings?: GuildSettingsService,
  ) {}

  /** The full table for a guild, best team first. */
  async forGuild(guildId: string): Promise<TeamStanding[]> {
    const [played, points] = await Promise.all([
      this.scrimmages.list(guildId, { status: ScrimmageStatus.Played }),
      this.settings ? this.settings.get(guildId).then((s) => s.points) : DEFAULT_POINTS,
    ]);
    return buildStandings(played, points);
  }

  /** One team's record (all zeros if it has not played). */
  async forTeam(guildId: string, teamId: string): Promise<TeamStanding> {
    const table = await this.forGuild(guildId);
    return table.find((standing) => standing.teamId === teamId) ?? emptyStanding(teamId);
  }
}
