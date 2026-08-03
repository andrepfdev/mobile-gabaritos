import { eq, isNull, sql } from 'drizzle-orm';
import { db } from './client';
import { exams as examsTable } from './schema';
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

export async function listExams(): Promise<Exam[]> {
  const rows = await db.select().from(examsTable).where(isNull(examsTable.deletedAt));
  return rows.map(toExam);
}

/** Counts every exam row, including soft-deleted ones — used to enforce the free plan limit so it
 *  can't be bypassed by deleting and recreating exams. */
export async function countAllExams(): Promise<number> {
  const result = await db.select({ count: sql<number>`count(*)` }).from(examsTable);
  return result[0]?.count ?? 0;
}

export async function upsertExam(exam: Exam): Promise<void> {
  const now = new Date().toISOString();
  const values = {
    id: exam.id,
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

export async function softDeleteExam(id: string): Promise<void> {
  await db.update(examsTable).set({ deletedAt: new Date().toISOString() }).where(eq(examsTable.id, id));
}
