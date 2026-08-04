import { AnswerKey, Exam } from './localDb/schema';

export const CALIBRATION_EXAM_ID = 'exam-calibration';
/** `code` is stable and globally unique-ish (see lib/gabarito/code.ts — generated codes never end
 *  in "000"), unlike `id`, which gets namespaced per user on seed to avoid PK collisions between
 *  accounts sharing the same device. Prefer this for "is this the calibration exam?" checks. */
export const CALIBRATION_EXAM_CODE = 'CAL000';

export const weekdayCorrections = [
  { label: 'Seg', value: 4 },
  { label: 'Ter', value: 7 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 8 },
  { label: 'Sex', value: 5 },
];

export const performanceOverTime = [
  { label: 'JAN', value: 58 },
  { label: 'FEV', value: 64 },
  { label: 'MAR', value: 60 },
  { label: 'ABR', value: 78 },
  { label: 'MAI', value: 67 },
];

export const statisticsSummary = {
  examsToday: 5,
  examsTodayTag: '60% em andamento',
  pendingCorrections: 2,
  pendingTag: '+1 ontem',
  avgTimePerExam: '2h 25min',
  weeklyActivityPercent: 78,
  completionPercent: 78,
  completionFraction: '39 de 50 provas',
};

export const mockExams: Exam[] = [
  {
    id: CALIBRATION_EXAM_ID,
    title: 'Gabarito de Calibração',
    subject: undefined,
    className: undefined,
    code: 'CAL000',
    optionsCount: 5,
    questionCount: 10,
    dueDate: undefined,
    createdAt: '2026-07-01T10:00:00.000Z',
    priority: 'none',
    status: 'waiting',
    students: [],
  },
];

// All 10 questions pre-filled, cycling through every option letter so the calibration sheet
// exercises every bubble column when scanned back. Keys are 0-indexed (question N -> key N-1),
// matching the convention used by AnswerGrid and scoreAgainstAnswerKey.
export const mockAnswerKeys: AnswerKey[] = [
  {
    examId: CALIBRATION_EXAM_ID,
    answers: { 0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'A', 6: 'B', 7: 'C', 8: 'D', 9: 'E' },
  },
];
