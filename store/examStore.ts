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
async function importFromAsyncStorageIfNeeded(): Promise<void> {
  const [existingExams, oldExams, oldAnswerKeys] = await Promise.all([
    listExams(),
    getAll<Exam>(STORAGE_KEYS.exams),
    getAll<AnswerKey>(STORAGE_KEYS.answerKeys),
  ]);

  if (existingExams.length > 0 || oldExams.length === 0) return;

  let sequence = 0;
  for (const exam of oldExams) {
    sequence += 1;
    await upsertExam(backfillExam(exam, sequence));
  }
  for (const answerKey of oldAnswerKeys) {
    await upsertAnswerKey(answerKey);
  }
}

type ExamStore = {
  hydrated: boolean;
  exams: Exam[];
  /** Count of all exams ever created, including soft-deleted ones — used to enforce the free
   *  plan limit (see hooks/useCanCreateExam.ts) so it can't be bypassed via delete+recreate. */
  totalExamCount: number;
  answerKeys: AnswerKey[];
  examResults: ExamResultRecord[];
  examClasses: ExamClassLink[];

  hydrate: () => Promise<void>;
  createExam: (exam: Exam) => Promise<void>;
  updateExam: (exam: Exam) => Promise<void>;
  deleteExam: (examId: string) => Promise<void>;
  saveAnswerKey: (answerKey: AnswerKey) => Promise<void>;
  saveExamResult: (result: ExamResultRecord) => Promise<void>;
  linkExamClasses: (examId: string, classIds: string[]) => Promise<void>;

  getAnswerKey: (examId: string) => AnswerKey | undefined;
};

export const useExamStore = create<ExamStore>((set, get) => ({
  hydrated: false,
  exams: [],
  totalExamCount: 0,
  answerKeys: [],
  examResults: [],
  examClasses: [],

  hydrate: async () => {
    await ensureMigrated();
    await importFromAsyncStorageIfNeeded();

    let exams = await listExams();
    let answerKeys = await listAnswerKeys();

    if (exams.length === 0) {
      for (const exam of mockExams) {
        await upsertExam(exam);
      }
      for (const answerKey of mockAnswerKeys) {
        await upsertAnswerKey(answerKey);
      }
      exams = await listExams();
      answerKeys = await listAnswerKeys();
    }

    const examResults = await listAllExamResults();
    const examClasses = await listExamClassLinks();

    set({ exams, answerKeys, examResults, examClasses, totalExamCount: await countAllExams(), hydrated: true });
  },

  createExam: async (exam) => {
    await upsertExam(exam);
    set({ exams: await listExams(), totalExamCount: await countAllExams() });
  },

  updateExam: async (exam) => {
    await upsertExam(exam);
    set({ exams: await listExams() });
  },

  deleteExam: async (examId) => {
    await softDeleteExam(examId);
    set({ exams: await listExams(), totalExamCount: await countAllExams() });
  },

  saveAnswerKey: async (answerKey) => {
    await upsertAnswerKey(answerKey);
    set({ answerKeys: await listAnswerKeys() });
  },

  saveExamResult: async (result) => {
    await upsertExamResult(result);
    set({ examResults: await listAllExamResults() });
  },

  linkExamClasses: async (examId, classIds) => {
    await setExamClasses(examId, classIds);
    set({ examClasses: await listExamClassLinks() });
  },

  getAnswerKey: (examId) => get().answerKeys.find((key) => key.examId === examId),
}));
