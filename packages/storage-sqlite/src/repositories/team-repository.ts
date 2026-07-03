import { and, eq, sql } from 'drizzle-orm';
import type { Team, TeamMember, TeamRepository, TeamRole } from '@scrimmage/core';
import type { Db } from '../client.js';
import { teamMembers, teams } from '../schema.js';

type TeamRow = typeof teams.$inferSelect;
type MemberRow = typeof teamMembers.$inferSelect;

function toTeam(row: TeamRow): Team {
  return {
    id: row.id,
    guildId: row.guildId,
    name: row.name,
    tag: row.tag,
    captainId: row.captainId,
    description: row.description,
    logoUrl: row.logoUrl,
    roleId: row.roleId,
    createdAt: row.createdAt,
  };
}

function toMember(row: MemberRow): TeamMember {
  return {
    teamId: row.teamId,
    userId: row.userId,
    role: row.role as TeamRole,
    joinedAt: row.joinedAt,
  };
}

export class DrizzleTeamRepository implements TeamRepository {
  constructor(private readonly db: Db) {}

  async create(team: Team): Promise<Team> {
    this.db.insert(teams).values(team).run();
    return team;
  }

  async update(team: Team): Promise<Team> {
    this.db
      .update(teams)
      .set({
        name: team.name,
        tag: team.tag,
        captainId: team.captainId,
        description: team.description,
        logoUrl: team.logoUrl,
        roleId: team.roleId,
      })
      .where(and(eq(teams.id, team.id), eq(teams.guildId, team.guildId)))
      .run();
    return team;
  }

  async findById(guildId: string, id: string): Promise<Team | null> {
    const row = this.db
      .select()
      .from(teams)
      .where(and(eq(teams.id, id), eq(teams.guildId, guildId)))
      .get();
    return row ? toTeam(row) : null;
  }

  async findByName(guildId: string, name: string): Promise<Team | null> {
    const row = this.db
      .select()
      .from(teams)
      .where(and(eq(teams.guildId, guildId), eq(sql`lower(${teams.name})`, name.toLowerCase())))
      .get();
    return row ? toTeam(row) : null;
  }

  async list(guildId: string): Promise<Team[]> {
    const rows = this.db.select().from(teams).where(eq(teams.guildId, guildId)).all();
    return rows.map(toTeam);
  }

  async delete(guildId: string, id: string): Promise<void> {
    this.db
      .delete(teams)
      .where(and(eq(teams.id, id), eq(teams.guildId, guildId)))
      .run();
  }

  async addMember(member: TeamMember): Promise<void> {
    this.db.insert(teamMembers).values(member).run();
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    this.db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .run();
  }

  async setMemberRole(teamId: string, userId: string, role: TeamRole): Promise<void> {
    this.db
      .update(teamMembers)
      .set({ role })
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .run();
  }

  async findMember(teamId: string, userId: string): Promise<TeamMember | null> {
    const row = this.db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .get();
    return row ? toMember(row) : null;
  }

  async listMembers(teamId: string): Promise<TeamMember[]> {
    const rows = this.db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId)).all();
    return rows.map(toMember);
  }

  async findUserTeam(guildId: string, userId: string): Promise<Team | null> {
    const row = this.db
      .select({ team: teams })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(and(eq(teams.guildId, guildId), eq(teamMembers.userId, userId)))
      .get();
    return row ? toTeam(row.team) : null;
  }
}
