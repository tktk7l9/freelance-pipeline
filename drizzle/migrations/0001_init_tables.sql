CREATE TABLE `case_log` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`at` text NOT NULL,
	`kind` text NOT NULL,
	`from_status` text,
	`to_status` text,
	`body` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `case_log_case_idx` ON `case_log` (`case_id`,`at`);--> statement-breakpoint
CREATE TABLE `cases` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`title` text NOT NULL,
	`route` text NOT NULL,
	`agent_name` text,
	`monthly_max_incl` integer NOT NULL,
	`monthly_min_incl` integer,
	`source_tax_basis` text NOT NULL,
	`settlement_min_h` integer,
	`settlement_max_h` integer,
	`remote_type` text NOT NULL,
	`onsite_note` text,
	`start_date` text NOT NULL,
	`end_date` text,
	`days_per_week` text,
	`work_location` text,
	`supply_chain` text,
	`payment_site_days` integer,
	`source_url` text,
	`must_skills` text DEFAULT '[]' NOT NULL,
	`nice_skills` text DEFAULT '[]' NOT NULL,
	`raw_text` text NOT NULL,
	`status` text DEFAULT 'saved' NOT NULL,
	`next_action` text,
	`next_action_due` text,
	`fit_scores` text,
	`actual_monthly_incl` integer,
	`note` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cases_status_idx` ON `cases` (`status`);--> statement-breakpoint
CREATE INDEX `cases_due_idx` ON `cases` (`next_action_due`);--> statement-breakpoint
CREATE UNIQUE INDEX `cases_source_url_unique` ON `cases` (`source_url`);