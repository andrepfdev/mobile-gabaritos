CREATE TABLE `exam_classes` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`class_id` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `exam_classes` (`id`, `exam_id`, `class_id`)
	SELECT `id` || ':' || `class_id`, `id`, `class_id` FROM `exams` WHERE `class_id` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `exams` DROP COLUMN `class_id`;
