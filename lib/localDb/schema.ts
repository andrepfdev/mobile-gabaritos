export type ExamStatus = 'to_correct' | 'in_progress' | 'review' | 'waiting';
export type ExamPriority = 'medium' | 'none';

export type Exam = {
  id: string;
  title: string;
  subject?: string;
  className?: string;
  questionCount: number;
  dueDate?: string; // ISO date
  createdAt: string; // ISO date-time
  priority: ExamPriority;
  status: ExamStatus;
  students: { id: string; name: string; avatarUri?: string }[];
  /** Short human-readable code shown on the printed gabarito (e.g. "MAT006") so the teacher can visually confirm the sheet belongs to this exam. */
  code: string;
  /** Number of alternatives per question on the gabarito: A-D or A-E. */
  optionsCount: 4 | 5;
};

export type AnswerKey = {
  examId: string; // 1:1 with Exam
  answers: Record<number, string>; // questionIndex -> 'A'..'E'
};

// AsyncStorage keys used only by the one-time migration into SQLite (lib/db/*) — see
// store/examStore.ts's importFromAsyncStorageIfNeeded. Not the primary storage path anymore.
export const STORAGE_KEYS = {
  exams: '@provazero/exams',
  answerKeys: '@provazero/answerKeys',
  onboardingSeen: '@provazero/onboardingSeen',
} as const;
