ALTER TABLE `guild_settings` ADD `points_win` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `guild_settings` ADD `points_draw` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `guild_settings` ADD `points_loss` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `guild_settings` ADD `admin_role_id` text;--> statement-breakpoint
ALTER TABLE `guild_settings` ADD `reminder_lead_minutes` integer;