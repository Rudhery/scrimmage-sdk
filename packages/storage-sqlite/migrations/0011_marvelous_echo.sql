CREATE TABLE `poll_votes` (
	`poll_id` text NOT NULL,
	`slot_index` integer NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`poll_id`, `slot_index`, `user_id`),
	FOREIGN KEY (`poll_id`) REFERENCES `polls`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `polls` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`title` text NOT NULL,
	`slots` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
