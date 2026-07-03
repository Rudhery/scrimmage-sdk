import { z } from 'zod';
import type { GuildSettings } from '../domain/guild-settings.js';
import type { GuildSettingsRepository } from '../storage/repositories.js';
import { parse } from '../validation.js';

function defaults(guildId: string): GuildSettings {
  return {
    guildId,
    announceChannelId: null,
    language: null,
    points: { win: 3, draw: 1, loss: 0 },
    adminRoleId: null,
    coachRoleId: null,
    assistantRoleId: null,
    reminderLeadMinutes: null,
    brandColor: null,
  };
}

const pointSchema = z.number().int().min(0).max(100);
const leadSchema = z.number().int().min(1).max(1440);
const colorSchema = z.number().int().min(0).max(0xffffff);

/** Reads and updates per-guild settings, returning sensible defaults when unset. */
export class GuildSettingsService {
  constructor(private readonly settings: GuildSettingsRepository) {}

  /** Current settings for a guild (defaults if it has never been configured). */
  async get(guildId: string): Promise<GuildSettings> {
    return (await this.settings.get(guildId)) ?? defaults(guildId);
  }

  /** Set or clear (with `null`) the announcement channel. */
  async setAnnounceChannel(guildId: string, channelId: string | null): Promise<GuildSettings> {
    const current = await this.get(guildId);
    return this.settings.upsert({ ...current, announceChannelId: channelId });
  }

  /** Set or clear (with `null`) the preferred language. */
  async setLanguage(guildId: string, language: string | null): Promise<GuildSettings> {
    const current = await this.get(guildId);
    return this.settings.upsert({ ...current, language });
  }

  /** Set the points awarded for win / draw / loss. */
  async setPoints(
    guildId: string,
    win: number,
    draw: number,
    loss: number,
  ): Promise<GuildSettings> {
    const points = {
      win: parse(pointSchema, win),
      draw: parse(pointSchema, draw),
      loss: parse(pointSchema, loss),
    };
    const current = await this.get(guildId);
    return this.settings.upsert({ ...current, points });
  }

  /** Set or clear (with `null`) the scrim-admin role. */
  async setAdminRole(guildId: string, roleId: string | null): Promise<GuildSettings> {
    const current = await this.get(guildId);
    return this.settings.upsert({ ...current, adminRoleId: roleId });
  }

  /** Set or clear (with `null`) the Discord role that marks a team's coach. */
  async setCoachRole(guildId: string, roleId: string | null): Promise<GuildSettings> {
    const current = await this.get(guildId);
    return this.settings.upsert({ ...current, coachRoleId: roleId });
  }

  /** Set or clear (with `null`) the Discord role that marks a team's assistant. */
  async setAssistantRole(guildId: string, roleId: string | null): Promise<GuildSettings> {
    const current = await this.get(guildId);
    return this.settings.upsert({ ...current, assistantRoleId: roleId });
  }

  /** Set or clear (with `null`) the per-guild reminder lead time, in minutes. */
  async setReminderLead(guildId: string, minutes: number | null): Promise<GuildSettings> {
    const reminderLeadMinutes = minutes === null ? null : parse(leadSchema, minutes);
    const current = await this.get(guildId);
    return this.settings.upsert({ ...current, reminderLeadMinutes });
  }

  /** Set or clear (with `null`) the embed accent color (0xRRGGBB). */
  async setBrandColor(guildId: string, color: number | null): Promise<GuildSettings> {
    const brandColor = color === null ? null : parse(colorSchema, color);
    const current = await this.get(guildId);
    return this.settings.upsert({ ...current, brandColor });
  }
}
