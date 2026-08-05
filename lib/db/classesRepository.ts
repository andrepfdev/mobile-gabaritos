import { and, eq, isNull } from 'drizzle-orm';
import { db } from './client';
import { classes as classesTable, examClasses as examClassesTable } from './schema';

export type ClassRecord = { id: string; name: string; turma?: string; subject?: string };

export async function listClasses(userId: string): Promise<ClassRecord[]> {
  const rows = await db
    .select()
    .from(classesTable)
    .where(and(eq(classesTable.userId, userId), isNull(classesTable.deletedAt)));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    turma: row.turma ?? undefined,
    subject: row.subject ?? undefined,
  }));
}

export async function createClass(record: ClassRecord, userId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.insert(classesTable).values({
    id: record.id,
    userId,
    name: record.name,
    turma: record.turma ?? null,
    subject: record.subject ?? null,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateClass(record: ClassRecord): Promise<void> {
  await db
    .update(classesTable)
    .set({
      name: record.name,
      turma: record.turma ?? null,
      subject: record.subject ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(classesTable.id, record.id));
}

/** Soft-deletes the turma and hard-deletes its links to provas — those links have no lifecycle of
 *  their own once the turma they point to is gone. Students in the turma are cascaded separately
 *  by the caller via softDeleteStudent (see store/classStore.ts). */
export async function softDeleteClass(id: string): Promise<void> {
  db.transaction((tx) => {
    tx.update(classesTable).set({ deletedAt: new Date().toISOString() }).where(eq(classesTable.id, id)).run();
    tx.delete(examClassesTable).where(eq(examClassesTable.classId, id)).run();
  });
}
