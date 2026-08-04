import { isNull } from 'drizzle-orm';
import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from './migrations/migrations';
import * as schema from './schema';

const sqlite = openDatabaseSync('provazero.db');
export const db = drizzle(sqlite, { schema });

let migratedPromise: Promise<void> | undefined;

/** Applies any pending Drizzle migrations, once per app run. If migration fails, the cached
 *  promise is dropped so the next call (e.g. a user-triggered retry) attempts again instead of
 *  replaying the same rejection forever. */
export function ensureMigrated(): Promise<void> {
  if (!migratedPromise) {
    migratedPromise = migrate(db, migrations).catch((err) => {
      migratedPromise = undefined;
      throw err;
    });
  }
  return migratedPromise;
}

let orphansClaimed = false;

/**
 * Migration `0001_add_user_scoping` added `user_id` to every local table via `ALTER TABLE ADD
 * COLUMN`, which leaves it NULL on rows that existed before multi-account support — there's no way
 * for a plain SQL migration to know which account those rows belonged to. Whoever logs in first
 * after the update adopts them (same one-time-import spirit as importFromAsyncStorageIfNeeded in
 * store/examStore.ts). Runs once per app process.
 */
export function claimOrphanedRows(userId: string): void {
  if (orphansClaimed) return;
  orphansClaimed = true;
  db.transaction((tx) => {
    tx.update(schema.exams).set({ userId }).where(isNull(schema.exams.userId)).run();
    tx.update(schema.classes).set({ userId }).where(isNull(schema.classes.userId)).run();
    tx.update(schema.students).set({ userId }).where(isNull(schema.students.userId)).run();
    tx.update(schema.answerKeys).set({ userId }).where(isNull(schema.answerKeys.userId)).run();
    tx.update(schema.examResults).set({ userId }).where(isNull(schema.examResults.userId)).run();
    tx.update(schema.examClasses).set({ userId }).where(isNull(schema.examClasses.userId)).run();
  });
}
