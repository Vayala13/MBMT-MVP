ALTER TABLE `call_logs` ADD `key_points` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `call_logs` ADD `action_items` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `call_logs` ADD `transcript` text;