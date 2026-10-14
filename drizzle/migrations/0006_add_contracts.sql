CREATE TABLE `contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`monthly_incl` integer NOT NULL,
	`settlement_min_h` integer,
	`settlement_max_h` integer,
	`overtime_rate` integer,
	`deduction_rate` integer,
	`order_no` text,
	`note` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contracts_case_idx` ON `contracts` (`case_id`,`start_date`);
--> statement-breakpoint
-- Cases registered before this table had one "actual rate" column. Copy it into a contract row for
-- joined / ended cases (period and settlement range from the case row) so the rate history keeps
-- those values and the forecast reads one source. Ids are UUID-shaped like crypto.randomUUID().
INSERT INTO `contracts` (`id`, `case_id`, `start_date`, `end_date`, `monthly_incl`, `settlement_min_h`, `settlement_max_h`, `note`)
SELECT
	lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
	`id`,
	`start_date`,
	`end_date`,
	`actual_monthly_incl`,
	`settlement_min_h`,
	`settlement_max_h`,
	'実単価から引き継ぎ'
FROM `cases`
WHERE `actual_monthly_incl` IS NOT NULL AND `status` IN ('joined', 'ended');
