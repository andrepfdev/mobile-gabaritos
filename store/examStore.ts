import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAll, remove, upsert } from '../lib/localDb/repository';
import { computeResult } from '../lib/localDb/grading';
import { AnswerKey, Exam, Result, STORAGE_KEYS, StudentAnswer } from '../lib/localDb/schema';
import { mockExams } from '../lib/mockData';
import { generateExamCode } from '../lib/gabarito/code';

/** Backfills fields added after the schema shipped (`code`, `optionsCount`) for exams already saved in AsyncStorage. */
async function backfillExams(exams: Exam[]): Promise<Exam[]> {
  let sequence = 0;
  let changed = false;
  const patched = exams.map((exam) => {
    sequence += 1;
    let next = exam;
    if (!next.code) {
      changed = true;
      next = { ...next, code: generateExamCode(next.subject, sequence) };
    }
    if (!next.optionsCount) {
      changed = true;
      next = { ...next, optionsCount: 5 };
    }
    return next;
  });
  if (changed) {
    await AsyncStorage.setItem(STORAGE_KEYS.exams, JSON.stringify(patched));
  }
  return patched;
}

type ExamStore = {
  hydrated: boolean;
  exams: Exam[];
  answerKeys: AnswerKey[];
  studentAnswers: StudentAnswer[];
  results: Result[];

  hydrate: () => Promise<void>;
  createExam: (exam: Exam) => Promise<void>;
  updateExam: (exam: Exam) => Promise<void>;
  deleteExam: (examId: string) => Promise<void>;
  saveAnswerKey: (answerKey: AnswerKey) => Promise<void>;
  saveStudentAnswer: (studentAnswer: StudentAnswer) => Promise<Result>;

  getAnswerKey: (examId: string) => AnswerKey | undefined;
  getStudentAnswer: (examId: string, studentId: string) => StudentAnswer | undefined;
  getResult: (examId: string, studentId: string) => Result | undefined;
};

export const useExamStore = create<ExamStore>((set, get) => ({
  hydrated: false,
  exams: [],
  answerKeys: [],
  studentAnswers: [],
  results: [],

  hydrate: async () => {
    const [seeded, exams, answerKeys, studentAnswers, results] = await Promise.all([
      AsyncStorage.getItem('@provazero/seeded'),
      getAll<Exam>(STORAGE_KEYS.exams),
      getAll<AnswerKey>(STORAGE_KEYS.answerKeys),
      getAll<StudentAnswer>(STORAGE_KEYS.studentAnswers),
      getAll<Result>(STORAGE_KEYS.results),
    ]);

    if (!seeded) {
      await AsyncStorage.setItem(STORAGE_KEYS.exams, JSON.stringify(mockExams));
      await AsyncStorage.setItem('@provazero/seeded', 'true');
      set({ exams: mockExams, answerKeys, studentAnswers, results, hydrated: true });
      return;
    }

    const patchedExams = await backfillExams(exams);
    set({ exams: patchedExams, answerKeys, studentAnswers, results, hydrated: true });
  },

  createExam: async (exam) => {
    const exams = await upsert(STORAGE_KEYS.exams, exam, 'id');
    set({ exams });
  },

  updateExam: async (exam) => {
    const exams = await upsert(STORAGE_KEYS.exams, exam, 'id');
    set({ exams });
  },

  deleteExam: async (examId) => {
    const exams = await remove<Exam>(STORAGE_KEYS.exams, examId, 'id');
    set({ exams });
  },

  saveAnswerKey: async (answerKey) => {
    const answerKeys = await upsert(STORAGE_KEYS.answerKeys, answerKey, 'examId');
    set({ answerKeys });
  },

  saveStudentAnswer: async (studentAnswer) => {
    const studentAnswers = await upsert(STORAGE_KEYS.studentAnswers, studentAnswer, 'id');
    set({ studentAnswers });

    const answerKey = get().answerKeys.find((key) => key.examId === studentAnswer.examId);
    if (!answerKey) {
      throw new Error('Gabarito não configurado para esta prova.');
    }
    const result = computeResult(answerKey, studentAnswer);
    const results = await upsert(STORAGE_KEYS.results, result, 'studentAnswerId');
    set({ results });
    return result;
  },

  getAnswerKey: (examId) => get().answerKeys.find((key) => key.examId === examId),
  getStudentAnswer: (examId, studentId) =>
    get().studentAnswers.find((sa) => sa.examId === examId && sa.studentId === studentId),
  getResult: (examId, studentId) => {
    const sa = get().getStudentAnswer(examId, studentId);
    if (!sa) return undefined;
    return get().results.find((r) => r.studentAnswerId === sa.id);
  },
}));
