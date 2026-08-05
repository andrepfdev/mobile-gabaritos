ALTER TABLE `answer_keys` ADD `user_id` text;
--> statement-breakpoint
ALTER TABLE `classes` ADD `user_id` text;
--> statement-breakpoint
ALTER TABLE `exams` ADD `user_id` text;
--> statement-breakpoint
ALTER TABLE `exams` DROP COLUMN `students`;
--> statement-breakpoint
ALTER TABLE `students` ADD `user_id` text;
--> statement-breakpoint
ALTER TABLE `exam_results` ADD `user_id` text;
--> statement-breakpoint
ALTER TABLE `exam_classes` ADD `user_id` text;
--> statement-breakpoint
CREATE INDEX `answer_keys_user_id_idx` ON `answer_keys` (`user_id`);
--> statement-breakpoint
CREATE INDEX `classes_user_id_idx` ON `classes` (`user_id`);
--> statement-breakpoint
CREATE INDEX `exams_user_id_idx` ON `exams` (`user_id`);
--> statement-breakpoint
CREATE INDEX `students_user_id_idx` ON `students` (`user_id`);
--> statement-breakpoint
CREATE INDEX `students_class_id_idx` ON `students` (`class_id`);
--> statement-breakpoint
CREATE INDEX `exam_results_user_id_idx` ON `exam_results` (`user_id`);
--> statement-breakpoint
CREATE INDEX `exam_results_exam_id_idx` ON `exam_results` (`exam_id`);
--> statement-breakpoint
CREATE INDEX `exam_results_student_id_idx` ON `exam_results` (`student_id`);
--> statement-breakpoint
CREATE INDEX `exam_classes_user_id_idx` ON `exam_classes` (`user_id`);
--> statement-breakpoint
CREATE INDEX `exam_classes_exam_id_idx` ON `exam_classes` (`exam_id`);
--> statement-breakpoint
CREATE INDEX `exam_classes_class_id_idx` ON `exam_classes` (`class_id`);
