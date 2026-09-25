CREATE TABLE `market_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`taken_on` text NOT NULL,
	`skill` text NOT NULL,
	`source` text DEFAULT 'levtech' NOT NULL,
	`data` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `market_snapshots_unique` ON `market_snapshots` (`taken_on`,`skill`);