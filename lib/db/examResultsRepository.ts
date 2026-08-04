import { eq } from 'drizzle-orm';
import { db } from './client';
import { examResults as examResultsTable } from './schema';

export type ExamResultRecord = {
  examId: string;
  studentId: string;
  answers: Record<number, string>;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  scorePercent: number;
};

function toRecordId(examId: string, studentId: string): string {
  return `${examId}:${studentId}`;
}

export async function listExamResultsByExam(examId: string): Promise<ExamResultRecord[]> {
  const rows = await db.select().from(examResultsTable).where(eq(examResultsTable.examId, examId));
  return rows.map((row) => ({
    examId: row.examId,
    studentId: row.studentId,
    answers: row.answers,
    correctCount: row.correctCount,
    wrongCount: row.wrongCount,
    blankCount: row.blankCount,
    scorePercent: row.scorePercent,
  }));
}

export async function listAllExamResults(): Promise<ExamResultRecord[]> {
  const rows = await db.select().from(examResultsTable);
  return rows.map((row) => ({
    examId: row.examId,
    studentId: row.studentId,
    answers: row.answers,
    correctCount: row.correctCount,
    wrongCount: row.wrongCount,
    blankCount: row.blankCount,
    scorePercent: row.scorePercent,
  }));
}

export async function upsertExamResult(record: ExamResultRecord): Promise<void> {
  const now = new Date().toISOString();
  const id = toRecordId(record.examId, record.studentId);
  const values = {
    id,
    examId: record.examId,
    studentId: record.studentId,
    answers: record.answers,
    correctCount: record.correctCount,
    wrongCount: record.wrongCount,
    blankCount: record.blankCount,
    scorePercent: record.scorePercent,
  };

  await db
    .insert(examResultsTable)
    .values({ ...values, updatedAt: now })
    .onConflictDoUpdate({
      target: examResultsTable.id,
      set: { ...values, updatedAt: now },
    });
}
