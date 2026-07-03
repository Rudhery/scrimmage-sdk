CREATE TABLE `rsvps` (
	`scrimmage_id` text NOT NULL,
	`guild_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	PRIMARY KEY(`scrimmage_id`, `user_id`),
	FOREIGN KEY (`scrimmage_id`) REFERENCES `scrimmages`(`id`) ON UPDATE no action ON DELETE cascade
);
