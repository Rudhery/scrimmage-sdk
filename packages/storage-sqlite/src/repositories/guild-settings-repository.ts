import { eq } from 'drizzle-orm';
import type { GuildSettings, GuildSettingsRepository } from '@scrimmage/core';
import type { Db } from '../client.js';
import { guildSettings } from '../schema.js';

export class DrizzleGuildSettingsRepository implements GuildSettingsRepository {
  constructor(private readonly db: Db) {}

  async get(guildId: string): Promise<GuildSettings | null> {
    const row = this.db
      .select()
      .from(guildSettings)
      .where(eq(guildSettings.guildId, guildId))
      .get();
    if (!row) {
      return null;
    }
    return {
      guildId: row.guildId,
      announceChannelId: row.announceChannelId,
      language: row.language,
      points: { win: row.pointsWin, draw: row.pointsDraw, loss: row.pointsLoss },
      adminRoleId: row.adminRoleId,
      coachRoleId: row.coachRoleId,
      assistantRoleId: row.assistantRoleId,
      reminderLeadMinutes: row.reminderLeadMinutes,
      brandColor: row.brandColor,
    };
  }

  async upsert(settings: GuildSettings): Promise<GuildSettings> {
    const values = {
      guildId: settings.guildId,
      announceChannelId: settings.announceChannelId,
      language: settings.language,
      pointsWin: settings.points.win,
      pointsDraw: settings.points.draw,
      pointsLoss: settings.points.loss,
      adminRoleId: settings.adminRoleId,
      coachRoleId: settings.coachRoleId,
      assistantRoleId: settings.assistantRoleId,
      reminderLeadMinutes: settings.reminderLeadMinutes,
      brandColor: settings.brandColor,
    };
    this.db
      .insert(guildSettings)
      .values(values)
      .onConflictDoUpdate({
        target: guildSettings.guildId,
        set: {
          announceChannelId: values.announceChannelId,
          language: values.language,
          pointsWin: values.pointsWin,
          pointsDraw: values.pointsDraw,
          pointsLoss: values.pointsLoss,
          adminRoleId: values.adminRoleId,
          coachRoleId: values.coachRoleId,
          assistantRoleId: values.assistantRoleId,
          reminderLeadMinutes: values.reminderLeadMinutes,
          brandColor: values.brandColor,
        },
      })
      .run();
    return settings;
  }
}
