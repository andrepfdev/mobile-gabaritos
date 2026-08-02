import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from './migrations/migrations';
import * as schema from './schema';

const sqlite = openDatabaseSync('provazero.db');
export const db = drizzle(sqlite, { schema });

let migratedPromise: Promise<void> | null = null;

/** Applies any pending Drizzle migrations, once per app run. */
export function ensureMigrated(): Promise<void> {
  if (!migratedPromise) {
    migratedPromise = migrate(db, migrations);
  }
  return migratedPromise;
}
