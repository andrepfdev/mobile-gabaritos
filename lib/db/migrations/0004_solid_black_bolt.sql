ALTER TABLE `exams` ADD `class_id` text;--> statement-breakpoint
CREATE TABLE `exam_results` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`student_id` text NOT NULL,
	`answers` text NOT NULL,
	`correct_count` integer NOT NULL,
	`wrong_count` integer NOT NULL,
	`blank_count` integer NOT NULL,
	`score_percent` integer NOT NULL,
	`updated_at` text NOT NULL
);
