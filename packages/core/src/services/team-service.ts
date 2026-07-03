import { z } from 'zod';
import { TeamRole, type Team, type TeamMember } from '../domain/team.js';
import type { TeamRepository } from '../storage/repositories.js';
import { ConflictError, NotFoundError } from '../errors/index.js';
import { resolveRuntime, type ServiceRuntime } from '../runtime.js';
import { parse } from '../validation.js';

const teamNameSchema = z.string().trim().min(2).max(50);
const teamTagSchema = z
  .string()
  .trim()
  .min(2)
  .max(5)
  .regex(/^[A-Za-z0-9]+$/, 'Tag must contain only letters and numbers.');
const logoUrlSchema = z.string().trim().url('The logo must be a valid URL.').max(500);

const createTeamSchema = z.object({
  guildId: z.string().min(1),
  name: teamNameSchema,
  tag: teamTagSchema,
  captainId: z.string().min(1),
  description: z.string().trim().max(300).optional(),
  logoUrl: logoUrlSchema.optional(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

/**
 * Application service for managing teams and their rosters. Holds no state of its
 * own — all persistence goes through the injected {@link TeamRepository}.
 */
export class TeamService {
  private readonly runtime: ServiceRuntime;

  constructor(
    private readonly teams: TeamRepository,
    runtime?: Partial<ServiceRuntime>,
  ) {
    this.runtime = resolveRuntime(runtime);
  }

  /**
   * Enforce "one player, one team": reject a user who already belongs to a
   * different team in this guild. Pass the target team's id (or `null` when the
   * team does not exist yet) so a user already on that same team is allowed.
   */
  private async ensureNotOnAnotherTeam(
    guildId: string,
    userId: string,
    teamId: string | null,
  ): Promise<void> {
    const current = await this.teams.findUserTeam(guildId, userId);
    if (current && current.id !== teamId) {
      throw new ConflictError(`That user is already a member of "${current.name}".`);
    }
  }

  /** Create a team and register its captain as the first member. */
  async createTeam(input: CreateTeamInput): Promise<Team> {
    const data = parse(createTeamSchema, input);

    const existing = await this.teams.findByName(data.guildId, data.name);
    if (existing) {
      throw new ConflictError(`A team named "${data.name}" already exists in this server.`);
    }
    await this.ensureNotOnAnotherTeam(data.guildId, data.captainId, null);

    const team: Team = {
      id: this.runtime.generateId(),
      guildId: data.guildId,
      name: data.name,
      tag: data.tag.toUpperCase(),
      captainId: data.captainId,
      description: data.description ?? null,
      logoUrl: data.logoUrl ?? null,
      roleId: null,
      createdAt: this.runtime.now(),
    };

    const created = await this.teams.create(team);
    await this.teams.addMember({
      teamId: created.id,
      userId: created.captainId,
      role: TeamRole.Player,
      joinedAt: created.createdAt,
    });
    this.runtime.events.emit('team.created', { team: created });
    return created;
  }

  /** Fetch a team, throwing {@link NotFoundError} if it does not exist. */
  async getTeam(guildId: string, teamId: string): Promise<Team> {
    const team = await this.teams.findById(guildId, teamId);
    if (!team) {
      throw new NotFoundError('Team not found.');
    }
    return team;
  }

  /** Fetch a team by its (case-insensitive) name, throwing if it does not exist. */
  async getTeamByName(guildId: string, name: string): Promise<Team> {
    const team = await this.teams.findByName(guildId, name);
    if (!team) {
      throw new NotFoundError(`No team named "${name}" in this server.`);
    }
    return team;
  }

  listTeams(guildId: string): Promise<Team[]> {
    return this.teams.list(guildId);
  }

  async deleteTeam(guildId: string, teamId: string): Promise<void> {
    const team = await this.getTeam(guildId, teamId);
    await this.teams.delete(guildId, teamId);
    this.runtime.events.emit('team.deleted', { team });
  }

  /** Rename a team, enforcing the same name rules and uniqueness as creation. */
  async renameTeam(guildId: string, teamId: string, newName: string): Promise<Team> {
    const name = parse(teamNameSchema, newName);
    const team = await this.getTeam(guildId, teamId);

    const clash = await this.teams.findByName(guildId, name);
    if (clash && clash.id !== team.id) {
      throw new ConflictError(`A team named "${name}" already exists in this server.`);
    }
    const renamed = await this.teams.update({ ...team, name });
    this.runtime.events.emit('team.renamed', { team: renamed, previousName: team.name });
    return renamed;
  }

  /** Change a team's tag (2–5 letters/numbers), stored uppercase. */
  async setTeamTag(guildId: string, teamId: string, tag: string): Promise<Team> {
    const team = await this.getTeam(guildId, teamId);
    const updated = await this.teams.update({
      ...team,
      tag: parse(teamTagSchema, tag).toUpperCase(),
    });
    this.runtime.events.emit('team.renamed', { team: updated, previousName: team.name });
    return updated;
  }

  /** Set (or clear, with `null`) the team crest/logo URL. */
  async setTeamLogo(guildId: string, teamId: string, logoUrl: string | null): Promise<Team> {
    const team = await this.getTeam(guildId, teamId);
    const url = logoUrl === null ? null : parse(logoUrlSchema, logoUrl);
    const updated = await this.teams.update({ ...team, logoUrl: url });
    this.runtime.events.emit('team.logoChanged', { team: updated });
    return updated;
  }

  /** Link (or unlink, with `null`) a Discord role to the team. */
  async setTeamRole(guildId: string, teamId: string, roleId: string | null): Promise<Team> {
    const team = await this.getTeam(guildId, teamId);
    return this.teams.update({ ...team, roleId });
  }

  /**
   * Hand captaincy to another user. The new captain is added to the roster first
   * if they are not already a member.
   */
  async transferCaptain(guildId: string, teamId: string, newCaptainId: string): Promise<Team> {
    const team = await this.getTeam(guildId, teamId);
    if (team.captainId === newCaptainId) {
      throw new ConflictError('That user is already the captain.');
    }

    const member = await this.teams.findMember(teamId, newCaptainId);
    if (!member) {
      await this.ensureNotOnAnotherTeam(guildId, newCaptainId, teamId);
      await this.teams.addMember({
        teamId,
        userId: newCaptainId,
        role: TeamRole.Player,
        joinedAt: this.runtime.now(),
      });
    }
    const updated = await this.teams.update({ ...team, captainId: newCaptainId });
    this.runtime.events.emit('team.captainTransferred', {
      team: updated,
      previousCaptainId: team.captainId,
    });
    return updated;
  }

  async addMember(
    guildId: string,
    teamId: string,
    userId: string,
    role: TeamRole = TeamRole.Player,
  ): Promise<TeamMember> {
    const team = await this.getTeam(guildId, teamId);
    await this.ensureNotOnAnotherTeam(guildId, userId, teamId);

    const existing = await this.teams.findMember(teamId, userId);
    if (existing) {
      throw new ConflictError('That user is already a member of this team.');
    }

    const member: TeamMember = { teamId, userId, role, joinedAt: this.runtime.now() };
    await this.teams.addMember(member);
    this.runtime.events.emit('team.memberAdded', { team, member });
    return member;
  }

  /** Set a member's role, adding them to the team first if they are not on it yet. */
  async setMemberRole(
    guildId: string,
    teamId: string,
    userId: string,
    role: TeamRole,
  ): Promise<TeamMember> {
    const team = await this.getTeam(guildId, teamId);

    const existing = await this.teams.findMember(teamId, userId);
    if (!existing) {
      await this.ensureNotOnAnotherTeam(guildId, userId, teamId);
    }
    const member: TeamMember = existing
      ? { ...existing, role }
      : { teamId, userId, role, joinedAt: this.runtime.now() };

    if (existing) {
      await this.teams.setMemberRole(teamId, userId, role);
    } else {
      await this.teams.addMember(member);
    }
    this.runtime.events.emit('team.memberRoleChanged', { team, member });
    return member;
  }

  async removeMember(guildId: string, teamId: string, userId: string): Promise<void> {
    const team = await this.getTeam(guildId, teamId);
    if (team.captainId === userId) {
      throw new ConflictError('The captain cannot be removed. Delete the team instead.');
    }

    const existing = await this.teams.findMember(teamId, userId);
    if (!existing) {
      throw new NotFoundError('That user is not a member of this team.');
    }
    await this.teams.removeMember(teamId, userId);
    this.runtime.events.emit('team.memberRemoved', { team, userId });
  }

  getRoster(teamId: string): Promise<TeamMember[]> {
    return this.teams.listMembers(teamId);
  }

  /** The team this user belongs to in the guild, if any (one team per person). */
  getUserTeam(guildId: string, userId: string): Promise<Team | null> {
    return this.teams.findUserTeam(guildId, userId);
  }

  /** A user's membership record on a team, if any. */
  getMember(teamId: string, userId: string): Promise<TeamMember | null> {
    return this.teams.findMember(teamId, userId);
  }
}
