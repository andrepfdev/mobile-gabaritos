import { eq } from 'drizzle-orm';
import { db } from './client';
import { examClasses as examClassesTable } from './schema';

export type ExamClassLink = { examId: string; classId: string };

export async function listExamClassLinks(): Promise<ExamClassLink[]> {
  const rows = await db.select().from(examClassesTable);
  return rows.map((row) => ({ examId: row.examId, classId: row.classId }));
}

/** Replace-all: whatever turmas were linked before, this is now the full set for this prova. */
export async function setExamClasses(examId: string, classIds: string[]): Promise<void> {
  await db.delete(examClassesTable).where(eq(examClassesTable.examId, examId));
  if (classIds.length === 0) return;
  await db.insert(examClassesTable).values(
    classIds.map((classId) => ({ id: `${examId}:${classId}`, examId, classId })),
  );
}
