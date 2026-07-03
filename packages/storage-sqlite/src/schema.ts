import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const teams = sqliteTable(
  'teams',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id').notNull(),
    name: text('name').notNull(),
    tag: text('tag').notNull(),
    captainId: text('captain_id').notNull(),
    description: text('description'),
    logoUrl: text('logo_url'),
    roleId: text('role_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('teams_guild_name_unique').on(table.guildId, table.name),
    index('teams_guild_idx').on(table.guildId),
  ],
);

export const teamMembers = sqliteTable(
  'team_members',
  {
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    role: text('role').notNull().default('player'),
    joinedAt: integer('joined_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.teamId, table.userId] })],
);

export const scrimmages = sqliteTable(
  'scrimmages',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id').notNull(),
    homeTeamId: text('home_team_id').notNull(),
    awayTeamId: text('away_team_id').notNull(),
    scheduledAt: integer('scheduled_at', { mode: 'timestamp_ms' }).notNull(),
    status: text('status').notNull(),
    homeScore: integer('home_score'),
    awayScore: integer('away_score'),
    proposedBy: text('proposed_by').notNull(),
    channelId: text('channel_id'),
    reminderSentAt: integer('reminder_sent_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('scrimmages_guild_idx').on(table.guildId),
    index('scrimmages_status_idx').on(table.status),
  ],
);

export const guildSettings = sqliteTable('guild_settings', {
  guildId: text('guild_id').primaryKey(),
  announceChannelId: text('announce_channel_id'),
  language: text('language'),
  pointsWin: integer('points_win').notNull().default(3),
  pointsDraw: integer('points_draw').notNull().default(1),
  pointsLoss: integer('points_loss').notNull().default(0),
  adminRoleId: text('admin_role_id'),
  coachRoleId: text('coach_role_id'),
  assistantRoleId: text('assistant_role_id'),
  reminderLeadMinutes: integer('reminder_lead_minutes'),
  brandColor: integer('brand_color'),
});

export const statCategories = sqliteTable(
  'stat_categories',
  {
    guildId: text('guild_id').notNull(),
    key: text('key').notNull(),
    label: text('label').notNull(),
    weight: real('weight').notNull(),
    position: integer('position').notNull(),
  },
  (table) => [primaryKey({ columns: [table.guildId, table.key] })],
);

export const playerStats = sqliteTable(
  'player_stats',
  {
    scrimmageId: text('scrimmage_id')
      .notNull()
      .references(() => scrimmages.id, { onDelete: 'cascade' }),
    guildId: text('guild_id').notNull(),
    teamId: text('team_id').notNull(),
    userId: text('user_id').notNull(),
    values: text('values').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.scrimmageId, table.userId] }),
    index('player_stats_guild_idx').on(table.guildId),
  ],
);

export const rsvps = sqliteTable(
  'rsvps',
  {
    scrimmageId: text('scrimmage_id')
      .notNull()
      .references(() => scrimmages.id, { onDelete: 'cascade' }),
    guildId: text('guild_id').notNull(),
    userId: text('user_id').notNull(),
    status: text('status').notNull(),
  },
  (table) => [primaryKey({ columns: [table.scrimmageId, table.userId] })],
);

export const polls = sqliteTable('polls', {
  id: text('id').primaryKey(),
  guildId: text('guild_id').notNull(),
  title: text('title').notNull(),
  slots: text('slots').notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const pollVotes = sqliteTable(
  'poll_votes',
  {
    pollId: text('poll_id')
      .notNull()
      .references(() => polls.id, { onDelete: 'cascade' }),
    slotIndex: integer('slot_index').notNull(),
    userId: text('user_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.pollId, table.slotIndex, table.userId] })],
);

export const championships = sqliteTable(
  'championships',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id').notNull(),
    name: text('name').notNull(),
    format: text('format').notNull(),
    bestOf: integer('best_of').notNull(),
    startsAt: integer('starts_at', { mode: 'timestamp_ms' }).notNull(),
    endsAt: integer('ends_at', { mode: 'timestamp_ms' }).notNull(),
    status: text('status').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('championships_guild_idx').on(table.guildId)],
);

export const championshipTeams = sqliteTable(
  'championship_teams',
  {
    championshipId: text('championship_id')
      .notNull()
      .references(() => championships.id, { onDelete: 'cascade' }),
    teamId: text('team_id').notNull(),
    seed: integer('seed').notNull(),
  },
  (table) => [primaryKey({ columns: [table.championshipId, table.teamId] })],
);

export const matches = sqliteTable(
  'matches',
  {
    id: text('id').primaryKey(),
    championshipId: text('championship_id')
      .notNull()
      .references(() => championships.id, { onDelete: 'cascade' }),
    round: integer('round').notNull(),
    position: integer('position').notNull(),
    homeTeamId: text('home_team_id'),
    awayTeamId: text('away_team_id'),
    winnerTeamId: text('winner_team_id'),
    status: text('status').notNull(),
    nextMatchId: text('next_match_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('matches_championship_idx').on(table.championshipId)],
);

export const matchSets = sqliteTable(
  'match_sets',
  {
    matchId: text('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    setNumber: integer('set_number').notNull(),
    homeScore: integer('home_score').notNull(),
    awayScore: integer('away_score').notNull(),
  },
  (table) => [primaryKey({ columns: [table.matchId, table.setNumber] })],
);

export const botPresence = sqliteTable('bot_presence', {
  guildId: text('guild_id').primaryKey(),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' }).notNull(),
});

export const scrimmageAwards = sqliteTable(
  'scrimmage_awards',
  {
    scrimmageId: text('scrimmage_id')
      .notNull()
      .references(() => scrimmages.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    userId: text('user_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.scrimmageId, table.category] })],
);
