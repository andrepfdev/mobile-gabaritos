import { eq, isNull } from 'drizzle-orm';
import { db } from './client';
import { classes as classesTable } from './schema';

export type ClassRecord = { id: string; name: string; turma?: string; subject?: string };

export async function listClasses(): Promise<ClassRecord[]> {
  const rows = await db.select().from(classesTable).where(isNull(classesTable.deletedAt));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    turma: row.turma ?? undefined,
    subject: row.subject ?? undefined,
  }));
}

export async function createClass(record: ClassRecord): Promise<void> {
  const now = new Date().toISOString();
  await db.insert(classesTable).values({
    id: record.id,
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

export async function softDeleteClass(id: string): Promise<void> {
  await db.update(classesTable).set({ deletedAt: new Date().toISOString() }).where(eq(classesTable.id, id));
}
