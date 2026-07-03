CREATE TABLE `player_stats` (
	`scrimmage_id` text NOT NULL,
	`guild_id` text NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`values` text NOT NULL,
	PRIMARY KEY(`scrimmage_id`, `user_id`),
	FOREIGN KEY (`scrimmage_id`) REFERENCES `scrimmages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `player_stats_guild_idx` ON `player_stats` (`guild_id`);--> statement-breakpoint
CREATE TABLE `stat_categories` (
	`guild_id` text NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`weight` real NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`guild_id`, `key`)
);
