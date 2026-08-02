import { eq, isNull } from 'drizzle-orm';
import { db } from './client';
import { classes as classesTable } from './schema';

// Not used by any screen yet — the roster-by-class feature is planned for later. Exists now so
// that feature doesn't need its own database migration on top of this one.

export type ClassRecord = { id: string; name: string };

export async function listClasses(): Promise<ClassRecord[]> {
  const rows = await db.select().from(classesTable).where(isNull(classesTable.deletedAt));
  return rows.map((row) => ({ id: row.id, name: row.name }));
}

export async function createClass(record: ClassRecord): Promise<void> {
  const now = new Date().toISOString();
  await db.insert(classesTable).values({ ...record, createdAt: now, updatedAt: now });
}

export async function softDeleteClass(id: string): Promise<void> {
  await db.update(classesTable).set({ deletedAt: new Date().toISOString() }).where(eq(classesTable.id, id));
}
