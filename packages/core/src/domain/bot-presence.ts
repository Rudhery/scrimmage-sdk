/** A heartbeat recording that the bot was connected to a guild at a point in time. */
export interface BotPresence {
  readonly guildId: string;
  readonly lastSeenAt: Date;
}
