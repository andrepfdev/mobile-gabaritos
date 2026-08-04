import { create } from 'zustand';
import { getAll } from '../lib/localDb/repository';
import { AnswerKey, Exam, STORAGE_KEYS } from '../lib/localDb/schema';
import { mockAnswerKeys, mockExams } from '../lib/mockData';
import { generateExamCode } from '../lib/gabarito/code';
import { ensureMigrated } from '../lib/db/client';
import { listExams, upsertExam, softDeleteExam, countAllExams } from '../lib/db/examsRepository';
import { listAnswerKeys, upsertAnswerKey } from '../lib/db/answerKeysRepository';
import { ExamResultRecord, listAllExamResults, upsertExamResult } from '../lib/db/examResultsRepository';
import { ExamClassLink, listExamClassLinks, setExamClasses } from '../lib/db/examClassesRepository';

/** Backfills fields added after the schema shipped (`code`, `optionsCount`) for exams already saved. */
function backfillExam(exam: Exam, sequence: number): Exam {
  let next = exam;
  if (!next.code) {
    next = { ...next, code: generateExamCode(next.subject, sequence) };
  }
  if (!next.optionsCount) {
    next = { ...next, optionsCount: 5 };
  }
  return next;
}

/**
 * One-time import from the old AsyncStorage-based store (lib/localDb/repository.ts) into SQLite,
 * for devices that already had exams/gabaritos saved before this migration. Only runs when the
 * SQLite `exams` table is still empty — after the first successful import, SQLite is the source
 * of truth and this is skipped.
 */
async function importFromAsyncStorageIfNeeded(userId: string): Promise<void> {
  const [existingExams, oldExams, oldAnswerKeys] = await Promise.all([
    listExams(userId),
    getAll<Exam>(STORAGE_KEYS.exams),
    getAll<AnswerKey>(STORAGE_KEYS.answerKeys),
  ]);

  if (existingExams.length > 0 || oldExams.length === 0) return;

  let sequence = 0;
  for (const exam of oldExams) {
    sequence += 1;
    await upsertExam(backfillExam(exam, sequence), userId);
  }
  for (const answerKey of oldAnswerKeys) {
    await upsertAnswerKey(answerKey, userId);
  }
}

type ExamStore = {
  hydrated: boolean;
  /** userId this store's data was hydrated for — guards mutations from running before hydrate()
   *  and lets reset()/hydrate() detect an account switch. */
  hydratedUserId: string | null;
  exams: Exam[];
  /** Count of all exams ever created by this user, including soft-deleted ones — used to enforce
   *  the free plan limit (see hooks/useCanCreateExam.ts) so it can't be bypassed via delete+recreate. */
  totalExamCount: number;
  answerKeys: AnswerKey[];
  examResults: ExamResultRecord[];
  examClasses: ExamClassLink[];
  /** Set when hydrate() fails (e.g. local database couldn't open/migrate) — lets the UI show a
   *  retry screen instead of leaving the splash screen up forever. User-facing text only, no
   *  technical detail (see AGENTS.md). */
  hydrateError: string | null;

  hydrate: (userId: string) => Promise<void>;
  /** Clears in-memory state on logout — SQLite rows stay put, scoped by userId, ready for the next
   *  hydrate() when someone logs back in. */
  reset: () => void;
  createExam: (exam: Exam) => Promise<void>;
  updateExam: (exam: Exam) => Promise<void>;
  deleteExam: (examId: string) => Promise<void>;
  saveAnswerKey: (answerKey: AnswerKey) => Promise<void>;
  saveExamResult: (result: ExamResultRecord) => Promise<void>;
  linkExamClasses: (examId: string, classIds: string[]) => Promise<void>;

  getAnswerKey: (examId: string) => AnswerKey | undefined;
};

const initialState = {
  hydrated: false,
  hydratedUserId: null as string | null,
  exams: [] as Exam[],
  totalExamCount: 0,
  answerKeys: [] as AnswerKey[],
  examResults: [] as ExamResultRecord[],
  examClasses: [] as ExamClassLink[],
  hydrateError: null as string | null,
};

export const useExamStore = create<ExamStore>((set, get) => ({
  ...initialState,

  hydrate: async (userId) => {
    try {
      await ensureMigrated();
      await importFromAsyncStorageIfNeeded(userId);

      let exams = await listExams(userId);
      let answerKeys = await listAnswerKeys(userId);

      if (exams.length === 0) {
        // ids are namespaced per user: exams.id is a global PK, and the mock data uses fixed ids
        // (e.g. CALIBRATION_EXAM_ID) that would otherwise collide — and silently reassign
        // ownership — across different accounts sharing this device.
        for (const exam of mockExams) {
          await upsertExam({ ...exam, id: `${userId}:${exam.id}` }, userId);
        }
        for (const answerKey of mockAnswerKeys) {
          await upsertAnswerKey({ ...answerKey, examId: `${userId}:${answerKey.examId}` }, userId);
        }
        exams = await listExams(userId);
        answerKeys = await listAnswerKeys(userId);
      }

      const examResults = await listAllExamResults(userId);
      const examClasses = await listExamClassLinks(userId);

      set({
        exams,
        answerKeys,
        examResults,
        examClasses,
        totalExamCount: await countAllExams(userId),
        hydrated: true,
        hydratedUserId: userId,
        hydrateError: null,
      });
    } catch {
      set({ hydrateError: 'Não foi possível carregar suas provas. Verifique o espaço livre no aparelho e tente novamente.' });
    }
  },

  reset: () => set({ ...initialState }),

  createExam: async (exam) => {
    const userId = get().hydratedUserId!;
    await upsertExam(exam, userId);
    set({ exams: await listExams(userId), totalExamCount: await countAllExams(userId) });
  },

  updateExam: async (exam) => {
    const userId = get().hydratedUserId!;
    await upsertExam(exam, userId);
    set({ exams: await listExams(userId) });
  },

  deleteExam: async (examId) => {
    const userId = get().hydratedUserId!;
    await softDeleteExam(examId);
    set({ exams: await listExams(userId), totalExamCount: await countAllExams(userId) });
  },

  saveAnswerKey: async (answerKey) => {
    const userId = get().hydratedUserId!;
    await upsertAnswerKey(answerKey, userId);
    set({ answerKeys: await listAnswerKeys(userId) });
  },

  saveExamResult: async (result) => {
    const userId = get().hydratedUserId!;
    await upsertExamResult(result, userId);
    set({ examResults: await listAllExamResults(userId) });
  },

  linkExamClasses: async (examId, classIds) => {
    const userId = get().hydratedUserId!;
    await setExamClasses(examId, classIds, userId);
    set({ examClasses: await listExamClassLinks(userId) });
  },

  getAnswerKey: (examId) => get().answerKeys.find((key) => key.examId === examId),
}));
