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

export type StudentAnswer = {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  answers: Record<number, string>;
  photoUri?: string;
  startedAt: string;
  finishedAt?: string;
};

export type PerQuestionResult = {
  index: number;
  correct: boolean;
  given: string | undefined;
  expected: string;
};

export type Result = {
  studentAnswerId: string;
  examId: string;
  studentId: string;
  scorePercent: number;
  correctCount: number;
  wrongCount: number;
  perQuestion: PerQuestionResult[];
  timeSpentSeconds?: number;
  computedAt: string;
};

export const STORAGE_KEYS = {
  exams: '@provazero/exams',
  answerKeys: '@provazero/answerKeys',
  studentAnswers: '@provazero/studentAnswers',
  results: '@provazero/results',
  onboardingSeen: '@provazero/onboardingSeen',
} as const;
