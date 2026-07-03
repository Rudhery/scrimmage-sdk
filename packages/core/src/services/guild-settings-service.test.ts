import { describe, expect, it } from 'vitest';
import { GuildSettingsService } from './guild-settings-service.js';
import { createMemoryStorage } from '../testing/memory-storage.js';

describe('GuildSettingsService', () => {
  it('returns defaults for an unconfigured guild', async () => {
    const service = new GuildSettingsService(createMemoryStorage().guildSettings);
    expect(await service.get('g')).toEqual({
      guildId: 'g',
      announceChannelId: null,
      language: null,
      points: { win: 3, draw: 1, loss: 0 },
      adminRoleId: null,
      coachRoleId: null,
      assistantRoleId: null,
      reminderLeadMinutes: null,
      brandColor: null,
    });
  });

  it('sets and clears the coach and assistant roles independently', async () => {
    const service = new GuildSettingsService(createMemoryStorage().guildSettings);

    await service.setCoachRole('g', 'coach-role');
    const settings = await service.setAssistantRole('g', 'assistant-role');
    expect(settings.coachRoleId).toBe('coach-role');
    expect(settings.assistantRoleId).toBe('assistant-role');

    const cleared = await service.setCoachRole('g', null);
    expect(cleared.coachRoleId).toBeNull();
    expect(cleared.assistantRoleId).toBe('assistant-role');
  });

  it('sets points, admin role and reminder lead independently', async () => {
    const service = new GuildSettingsService(createMemoryStorage().guildSettings);

    await service.setPoints('g', 2, 1, 0);
    await service.setAdminRole('g', 'role-1');
    const settings = await service.setReminderLead('g', 30);

    expect(settings.points).toEqual({ win: 2, draw: 1, loss: 0 });
    expect(settings.adminRoleId).toBe('role-1');
    expect(settings.reminderLeadMinutes).toBe(30);
  });

  it('sets and clears the announce channel', async () => {
    const service = new GuildSettingsService(createMemoryStorage().guildSettings);

    const set = await service.setAnnounceChannel('g', 'chan-1');
    expect(set.announceChannelId).toBe('chan-1');
    expect((await service.get('g')).announceChannelId).toBe('chan-1');

    const cleared = await service.setAnnounceChannel('g', null);
    expect(cleared.announceChannelId).toBeNull();
  });

  it('sets and clears the language, preserving other settings', async () => {
    const service = new GuildSettingsService(createMemoryStorage().guildSettings);

    await service.setAnnounceChannel('g', 'chan-1');
    const set = await service.setLanguage('g', 'pt-BR');
    expect(set.language).toBe('pt-BR');
    expect(set.announceChannelId).toBe('chan-1');

    const cleared = await service.setLanguage('g', null);
    expect(cleared.language).toBeNull();
  });
});
