import { and, eq } from 'drizzle-orm';
import { db } from './client';
import { answerKeys as answerKeysTable } from './schema';
import type { AnswerKey } from '../localDb/schema';

function toAnswerKey(row: typeof answerKeysTable.$inferSelect): AnswerKey {
  return { examId: row.examId, answers: row.answers };
}

export async function listAnswerKeys(userId: string): Promise<AnswerKey[]> {
  const rows = await db.select().from(answerKeysTable).where(eq(answerKeysTable.userId, userId));
  return rows.map(toAnswerKey);
}

export async function upsertAnswerKey(answerKey: AnswerKey, userId: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(answerKeysTable)
    .values({ examId: answerKey.examId, userId, answers: answerKey.answers, updatedAt: now })
    .onConflictDoUpdate({
      target: answerKeysTable.examId,
      set: { answers: answerKey.answers, updatedAt: now },
    });
}

export async function getAnswerKey(examId: string, userId: string): Promise<AnswerKey | undefined> {
  const row = await db
    .select()
    .from(answerKeysTable)
    .where(and(eq(answerKeysTable.examId, examId), eq(answerKeysTable.userId, userId)))
    .get();
  return row ? toAnswerKey(row) : undefined;
}
