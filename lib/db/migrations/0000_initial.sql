CREATE TABLE `answer_keys` (
	`exam_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`answers` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`turma` text,
	`subject` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`subject` text,
	`class_name` text,
	`question_count` integer NOT NULL,
	`options_count` integer DEFAULT 5 NOT NULL,
	`due_date` text,
	`priority` text DEFAULT 'none' NOT NULL,
	`status` text DEFAULT 'to_correct' NOT NULL,
	`code` text NOT NULL,
	`students` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`class_id` text NOT NULL,
	`name` text NOT NULL,
	`avatar_uri` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `exam_results` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`exam_id` text NOT NULL,
	`student_id` text NOT NULL,
	`answers` text NOT NULL,
	`correct_count` integer NOT NULL,
	`wrong_count` integer NOT NULL,
	`blank_count` integer NOT NULL,
	`score_percent` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exam_classes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`exam_id` text NOT NULL,
	`class_id` text NOT NULL
);
