/** Points awarded per result, used to compute the standings. */
export interface PointsConfig {
  readonly win: number;
  readonly draw: number;
  readonly loss: number;
}

/** Per-guild configuration. Defaults apply when a guild has never been configured. */
export interface GuildSettings {
  readonly guildId: string;
  /** Channel where announcements (e.g. pre-game reminders) are posted, if set. */
  readonly announceChannelId: string | null;
  /** Preferred language (BCP-47-ish, e.g. `pt-BR`), or `null` to follow each user. */
  readonly language: string | null;
  /** Points for a win / draw / loss (defaults 3 / 1 / 0). */
  readonly points: PointsConfig;
  /** A Discord role that may manage teams & scrimmages, beyond captain/ManageGuild. */
  readonly adminRoleId: string | null;
  /** Discord role marking its holder (alongside a team's role) as that team's coach. */
  readonly coachRoleId: string | null;
  /** Discord role marking its holder (alongside a team's role) as that team's assistant. */
  readonly assistantRoleId: string | null;
  /** Minutes before kickoff to remind, or `null` to use the bot default. */
  readonly reminderLeadMinutes: number | null;
  /** Accent color (0xRRGGBB) for embeds, or `null` for the bot default. */
  readonly brandColor: number | null;
}
