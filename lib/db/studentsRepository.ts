import { and, eq, isNull } from 'drizzle-orm';
import { db } from './client';
import { students as studentsTable, examResults as examResultsTable } from './schema';

export type StudentRecord = { id: string; classId: string; name: string; avatarUri?: string };

export async function listAllStudents(userId: string): Promise<StudentRecord[]> {
  const rows = await db
    .select()
    .from(studentsTable)
    .where(and(eq(studentsTable.userId, userId), isNull(studentsTable.deletedAt)));
  return rows.map((row) => ({ id: row.id, classId: row.classId, name: row.name, avatarUri: row.avatarUri ?? undefined }));
}

export async function listStudentsByClass(classId: string, userId: string): Promise<StudentRecord[]> {
  const rows = await db
    .select()
    .from(studentsTable)
    .where(and(eq(studentsTable.classId, classId), eq(studentsTable.userId, userId), isNull(studentsTable.deletedAt)));
  return rows.map((row) => ({ id: row.id, classId: row.classId, name: row.name, avatarUri: row.avatarUri ?? undefined }));
}

export async function createStudent(record: StudentRecord, userId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.insert(studentsTable).values({
    id: record.id,
    userId,
    classId: record.classId,
    name: record.name,
    avatarUri: record.avatarUri ?? null,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateStudent(record: StudentRecord): Promise<void> {
  await db
    .update(studentsTable)
    .set({
      name: record.name,
      avatarUri: record.avatarUri ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(studentsTable.id, record.id));
}

/** Soft-deletes the student and hard-deletes their exam results — those have no lifecycle of their
 *  own once the student they belong to is gone. */
export async function softDeleteStudent(id: string): Promise<void> {
  db.transaction((tx) => {
    tx.update(studentsTable).set({ deletedAt: new Date().toISOString() }).where(eq(studentsTable.id, id)).run();
    tx.delete(examResultsTable).where(eq(examResultsTable.studentId, id)).run();
  });
}
