CREATE TABLE `ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`year_month` text NOT NULL,
	`kind` text NOT NULL,
	`party` text,
	`case_id` text,
	`amount` integer NOT NULL,
	`note` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ledger_ym_idx` ON `ledger` (`year_month`);