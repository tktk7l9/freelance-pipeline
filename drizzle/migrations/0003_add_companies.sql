CREATE TABLE `companies` (
	`name` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
