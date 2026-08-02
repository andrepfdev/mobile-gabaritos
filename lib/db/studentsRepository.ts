import { and, eq, isNull } from 'drizzle-orm';
import { db } from './client';
import { students as studentsTable } from './schema';

// Not used by any screen yet — the roster-by-class feature is planned for later. Exists now so
// that feature doesn't need its own database migration on top of this one.

export type StudentRecord = { id: string; classId: string; name: string; avatarUri?: string };

export async function listStudentsByClass(classId: string): Promise<StudentRecord[]> {
  const rows = await db
    .select()
    .from(studentsTable)
    .where(and(eq(studentsTable.classId, classId), isNull(studentsTable.deletedAt)));
  return rows.map((row) => ({ id: row.id, classId: row.classId, name: row.name, avatarUri: row.avatarUri ?? undefined }));
}

export async function createStudent(record: StudentRecord): Promise<void> {
  const now = new Date().toISOString();
  await db.insert(studentsTable).values({
    id: record.id,
    classId: record.classId,
    name: record.name,
    avatarUri: record.avatarUri ?? null,
    createdAt: now,
    updatedAt: now,
  });
}

export async function softDeleteStudent(id: string): Promise<void> {
  await db.update(studentsTable).set({ deletedAt: new Date().toISOString() }).where(eq(studentsTable.id, id));
}
