import { beforeEach, describe, expect, it } from 'vitest';
import { TeamService } from './team-service.js';
import { TeamRole } from '../domain/team.js';
import { ConflictError, NotFoundError, ValidationError } from '../errors/index.js';
import { createMemoryStorage } from '../testing/memory-storage.js';
import type { Storage } from '../storage/repositories.js';

const GUILD = 'guild-1';
const CAPTAIN = 'user-captain';

describe('TeamService', () => {
  let storage: Storage;
  let service: TeamService;
  let counter: number;

  beforeEach(() => {
    storage = createMemoryStorage();
    counter = 0;
    service = new TeamService(storage.teams, {
      now: () => new Date('2030-01-01T00:00:00.000Z'),
      generateId: () => `team-${++counter}`,
    });
  });

  const baseInput = () => ({ guildId: GUILD, name: 'Red Dragons', tag: 'rdg', captainId: CAPTAIN });

  it('creates a team, upper-cases the tag and adds the captain as a member', async () => {
    const team = await service.createTeam(baseInput());

    expect(team.id).toBe('team-1');
    expect(team.tag).toBe('RDG');
    expect(team.captainId).toBe(CAPTAIN);

    const roster = await service.getRoster(team.id);
    expect(roster).toHaveLength(1);
    expect(roster[0]?.userId).toBe(CAPTAIN);
  });

  it('rejects a duplicate team name within the same guild', async () => {
    await service.createTeam(baseInput());
    await expect(service.createTeam(baseInput())).rejects.toBeInstanceOf(ConflictError);
  });

  it('rejects an invalid tag', async () => {
    await expect(service.createTeam({ ...baseInput(), tag: '@@' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('throws when fetching an unknown team', async () => {
    await expect(service.getTeam(GUILD, 'missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deletes a team', async () => {
    const team = await service.createTeam(baseInput());
    await service.deleteTeam(GUILD, team.id);
    await expect(service.getTeam(GUILD, team.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('adds and removes members, but protects the captain', async () => {
    const team = await service.createTeam(baseInput());

    await service.addMember(GUILD, team.id, 'user-2');
    expect(await service.getRoster(team.id)).toHaveLength(2);

    await expect(service.addMember(GUILD, team.id, 'user-2')).rejects.toBeInstanceOf(ConflictError);

    await service.removeMember(GUILD, team.id, 'user-2');
    expect(await service.getRoster(team.id)).toHaveLength(1);

    await expect(service.removeMember(GUILD, team.id, CAPTAIN)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it('enforces one team per person across the guild', async () => {
    const red = await service.createTeam(baseInput());
    const blue = await service.createTeam({
      ...baseInput(),
      name: 'Blue Wolves',
      tag: 'BLU',
      captainId: 'cap-2',
    });

    await service.addMember(GUILD, red.id, 'user-x');
    // Already on Red — cannot be added to, or assigned a role on, Blue.
    await expect(service.addMember(GUILD, blue.id, 'user-x')).rejects.toBeInstanceOf(ConflictError);
    await expect(
      service.setMemberRole(GUILD, blue.id, 'user-x', TeamRole.Coach),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(service.transferCaptain(GUILD, blue.id, 'user-x')).rejects.toBeInstanceOf(
      ConflictError,
    );

    // Changing their role on their own team still works.
    const promoted = await service.setMemberRole(GUILD, red.id, 'user-x', TeamRole.Assistant);
    expect(promoted.role).toBe(TeamRole.Assistant);
  });

  it('rejects creating a team led by a captain who already belongs to one', async () => {
    await service.createTeam(baseInput());
    await expect(
      service.createTeam({ ...baseInput(), name: 'Second Squad', tag: 'SEC' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('renames a team and rejects clashing names', async () => {
    const team = await service.createTeam(baseInput());
    const renamed = await service.renameTeam(GUILD, team.id, 'Blue Wolves');
    expect(renamed.name).toBe('Blue Wolves');

    await service.createTeam({
      ...baseInput(),
      name: 'Green Owls',
      tag: 'GRN',
      captainId: 'owls-cap',
    });
    await expect(service.renameTeam(GUILD, team.id, 'Green Owls')).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it('transfers captaincy, adding the new captain to the roster if needed', async () => {
    const team = await service.createTeam(baseInput());

    const updated = await service.transferCaptain(GUILD, team.id, 'user-9');
    expect(updated.captainId).toBe('user-9');
    expect((await service.getRoster(team.id)).map((member) => member.userId)).toContain('user-9');

    await expect(service.transferCaptain(GUILD, team.id, 'user-9')).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it('stores a description and assigns member roles', async () => {
    const team = await service.createTeam({ ...baseInput(), description: 'We scrim nightly.' });
    expect(team.description).toBe('We scrim nightly.');

    const coach = await service.setMemberRole(GUILD, team.id, 'coach-1', TeamRole.Coach);
    expect(coach.role).toBe(TeamRole.Coach);

    const roster = await service.getRoster(team.id);
    expect(roster.find((member) => member.userId === 'coach-1')?.role).toBe(TeamRole.Coach);
  });

  it('sets and clears the team logo, rejecting invalid URLs', async () => {
    const team = await service.createTeam(baseInput());
    expect(team.logoUrl).toBeNull();

    const withLogo = await service.setTeamLogo(GUILD, team.id, 'https://example.com/crest.png');
    expect(withLogo.logoUrl).toBe('https://example.com/crest.png');

    await expect(service.setTeamLogo(GUILD, team.id, 'not-a-url')).rejects.toBeInstanceOf(
      ValidationError,
    );

    const cleared = await service.setTeamLogo(GUILD, team.id, null);
    expect(cleared.logoUrl).toBeNull();
  });

  it('links and unlinks a Discord role', async () => {
    const team = await service.createTeam(baseInput());
    expect(team.roleId).toBeNull();

    const linked = await service.setTeamRole(GUILD, team.id, 'role-1');
    expect(linked.roleId).toBe('role-1');

    const unlinked = await service.setTeamRole(GUILD, team.id, null);
    expect(unlinked.roleId).toBeNull();
  });
});
