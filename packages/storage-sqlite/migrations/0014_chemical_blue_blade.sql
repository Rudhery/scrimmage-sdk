CREATE TABLE `scrimmage_awards` (
	`scrimmage_id` text NOT NULL,
	`category` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`scrimmage_id`, `category`),
	FOREIGN KEY (`scrimmage_id`) REFERENCES `scrimmages`(`id`) ON UPDATE no action ON DELETE cascade
);
