CREATE TABLE `championship_teams` (
	`championship_id` text NOT NULL,
	`team_id` text NOT NULL,
	`seed` integer NOT NULL,
	PRIMARY KEY(`championship_id`, `team_id`),
	FOREIGN KEY (`championship_id`) REFERENCES `championships`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `championships` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`name` text NOT NULL,
	`format` text NOT NULL,
	`best_of` integer NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `championships_guild_idx` ON `championships` (`guild_id`);--> statement-breakpoint
CREATE TABLE `match_sets` (
	`match_id` text NOT NULL,
	`set_number` integer NOT NULL,
	`home_score` integer NOT NULL,
	`away_score` integer NOT NULL,
	PRIMARY KEY(`match_id`, `set_number`),
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`championship_id` text NOT NULL,
	`round` integer NOT NULL,
	`position` integer NOT NULL,
	`home_team_id` text,
	`away_team_id` text,
	`winner_team_id` text,
	`status` text NOT NULL,
	`next_match_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`championship_id`) REFERENCES `championships`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `matches_championship_idx` ON `matches` (`championship_id`);