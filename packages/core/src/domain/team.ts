/**
 * A team belongs to a single Discord guild (server) and groups a set of members
 * around a captain. Teams are the entities that face each other in scrimmages.
 */
export interface Team {
  /** Stable unique identifier. */
  readonly id: string;
  /** Discord guild (server) this team belongs to. */
  readonly guildId: string;
  /** Human-readable team name, unique within a guild. */
  readonly name: string;
  /** Short tag/abbreviation, e.g. "RDG". */
  readonly tag: string;
  /** Discord user id of the team captain. */
  readonly captainId: string;
  /** Optional free-text description / bio. */
  readonly description: string | null;
  /** Optional URL of the team crest/logo, shown as the embed thumbnail. */
  readonly logoUrl: string | null;
  /** Optional Discord role id linked to this team (its "colours"). */
  readonly roleId: string | null;
  /** When the team was created. */
  readonly createdAt: Date;
}

/**
 * The function a member plays within a team. The captain is tracked separately
 * on {@link Team.captainId}; everyone else carries one of these roles.
 */
export const TeamRole = {
  Coach: 'coach',
  Assistant: 'assistant',
  Player: 'player',
} as const;

export type TeamRole = (typeof TeamRole)[keyof typeof TeamRole];

/** Membership link between a Discord user and a team. */
export interface TeamMember {
  readonly teamId: string;
  /** Discord user id of the member. */
  readonly userId: string;
  readonly role: TeamRole;
  readonly joinedAt: Date;
}
