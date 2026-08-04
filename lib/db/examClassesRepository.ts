import { eq } from 'drizzle-orm';
import { db } from './client';
import { examClasses as examClassesTable } from './schema';

export type ExamClassLink = { examId: string; classId: string };

export async function listExamClassLinks(userId: string): Promise<ExamClassLink[]> {
  const rows = await db.select().from(examClassesTable).where(eq(examClassesTable.userId, userId));
  return rows.map((row) => ({ examId: row.examId, classId: row.classId }));
}

/** Replace-all: whatever turmas were linked before, this is now the full set for this prova.
 *  Wrapped in a transaction so a crash between the delete and the insert can't leave the prova
 *  with no turma links at all. */
export async function setExamClasses(examId: string, classIds: string[], userId: string): Promise<void> {
  db.transaction((tx) => {
    tx.delete(examClassesTable).where(eq(examClassesTable.examId, examId)).run();
    if (classIds.length === 0) return;
    tx.insert(examClassesTable)
      .values(classIds.map((classId) => ({ id: `${examId}:${classId}`, userId, examId, classId })))
      .run();
  });
}
