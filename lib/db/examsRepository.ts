import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from './client';
import {
  exams as examsTable,
  answerKeys as answerKeysTable,
  examResults as examResultsTable,
  examClasses as examClassesTable,
} from './schema';
import type { Exam } from '../localDb/schema';

function toExam(row: typeof examsTable.$inferSelect): Exam {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject ?? undefined,
    className: row.className ?? undefined,
    questionCount: row.questionCount,
    optionsCount: row.optionsCount as 4 | 5,
    dueDate: row.dueDate ?? undefined,
    createdAt: row.createdAt,
    priority: row.priority,
    status: row.status,
    students: row.students,
    code: row.code,
  };
}

export async function listExams(userId: string): Promise<Exam[]> {
  const rows = await db
    .select()
    .from(examsTable)
    .where(and(eq(examsTable.userId, userId), isNull(examsTable.deletedAt)));
  return rows.map(toExam);
}

/** Counts every exam row of this user, including soft-deleted ones — used to enforce the free plan
 *  limit so it can't be bypassed by deleting and recreating exams. */
export async function countAllExams(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(examsTable)
    .where(eq(examsTable.userId, userId));
  return result[0]?.count ?? 0;
}

export async function upsertExam(exam: Exam, userId: string): Promise<void> {
  const now = new Date().toISOString();
  const values = {
    id: exam.id,
    userId,
    title: exam.title,
    subject: exam.subject ?? null,
    className: exam.className ?? null,
    questionCount: exam.questionCount,
    optionsCount: exam.optionsCount,
    dueDate: exam.dueDate ?? null,
    priority: exam.priority,
    status: exam.status,
    code: exam.code,
    students: exam.students,
  };

  await db
    .insert(examsTable)
    .values({ ...values, createdAt: exam.createdAt, updatedAt: now })
    .onConflictDoUpdate({
      target: examsTable.id,
      set: { ...values, updatedAt: now },
    });
}

/** Soft-deletes the exam and hard-deletes everything derived from it (answer key, results, turma
 *  links) — those have no lifecycle of their own once the exam they belong to is gone. */
export async function softDeleteExam(id: string): Promise<void> {
  db.transaction((tx) => {
    tx.update(examsTable).set({ deletedAt: new Date().toISOString() }).where(eq(examsTable.id, id)).run();
    tx.delete(answerKeysTable).where(eq(answerKeysTable.examId, id)).run();
    tx.delete(examResultsTable).where(eq(examResultsTable.examId, id)).run();
    tx.delete(examClassesTable).where(eq(examClassesTable.examId, id)).run();
  });
}
