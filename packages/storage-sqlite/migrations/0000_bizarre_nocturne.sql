CREATE TABLE `scrimmages` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`home_team_id` text NOT NULL,
	`away_team_id` text NOT NULL,
	`scheduled_at` integer NOT NULL,
	`status` text NOT NULL,
	`home_score` integer,
	`away_score` integer,
	`proposed_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `scrimmages_guild_idx` ON `scrimmages` (`guild_id`);--> statement-breakpoint
CREATE INDEX `scrimmages_status_idx` ON `scrimmages` (`status`);--> statement-breakpoint
CREATE TABLE `team_members` (
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`joined_at` integer NOT NULL,
	PRIMARY KEY(`team_id`, `user_id`),
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`name` text NOT NULL,
	`tag` text NOT NULL,
	`captain_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_guild_name_unique` ON `teams` (`guild_id`,`name`);--> statement-breakpoint
CREATE INDEX `teams_guild_idx` ON `teams` (`guild_id`);