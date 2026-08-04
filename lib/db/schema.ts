import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import type { ExamPriority, ExamStatus } from '../localDb/schema';

/**
 * Every table carries id/createdAt/updatedAt/deletedAt (soft delete) — the minimum shape needed
 * to eventually support offline-first sync (stable ids, last-write-wins via updatedAt, tombstones
 * via deletedAt) without building the actual sync protocol yet.
 */

export const exams = sqliteTable('exams', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  subject: text('subject'),
  className: text('class_name'),
  questionCount: integer('question_count').notNull(),
  optionsCount: integer('options_count').notNull().default(5),
  dueDate: text('due_date'),
  priority: text('priority').notNull().default('none').$type<ExamPriority>(),
  status: text('status').notNull().default('to_correct').$type<ExamStatus>(),
  code: text('code').notNull(),
  /** Embedded list of {id,name,avatarUri} — kept as-is from the AsyncStorage days for ExamCard's
   *  avatar stack. Will move to a real examId->studentId link once the roster feature (using the
   *  `students`/`classes` tables below) is actually built. */
  students: text('students', { mode: 'json' }).notNull().$type<{ id: string; name: string; avatarUri?: string }[]>(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const answerKeys = sqliteTable('answer_keys', {
  examId: text('exam_id').primaryKey(),
  userId: text('user_id').notNull(),
  answers: text('answers', { mode: 'json' }).notNull().$type<Record<number, string>>(),
  updatedAt: text('updated_at').notNull(),
});

export const classes = sqliteTable('classes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  turma: text('turma'),
  subject: text('subject'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const students = sqliteTable('students', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  classId: text('class_id').notNull(),
  name: text('name').notNull(),
  avatarUri: text('avatar_uri'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

/** One row per (exam, student) — latest scan wins (upsert by id), no attempt history. */
export const examResults = sqliteTable('exam_results', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  examId: text('exam_id').notNull(),
  studentId: text('student_id').notNull(),
  answers: text('answers', { mode: 'json' }).notNull().$type<Record<number, string>>(),
  correctCount: integer('correct_count').notNull(),
  wrongCount: integer('wrong_count').notNull(),
  blankCount: integer('blank_count').notNull(),
  scorePercent: integer('score_percent').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/** Which turmas a prova is applied to — N:N, since the same prova (same gabarito/QR) can be
 *  applied to several turmas at once. */
export const examClasses = sqliteTable('exam_classes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  examId: text('exam_id').notNull(),
  classId: text('class_id').notNull(),
});
