import { AnswerKey, Exam } from './localDb/schema';

export const CALIBRATION_EXAM_ID = 'exam-calibration';

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
  {
    id: 'exam-1',
    title: 'Avaliação de Matemática — 3º Bimestre',
    subject: 'Matemática',
    className: '9º Ano B',
    code: 'MAT001',
    optionsCount: 5,
    questionCount: 10,
    dueDate: '2026-08-15',
    createdAt: '2026-07-20T10:00:00.000Z',
    priority: 'medium',
    status: 'to_correct',
    students: [
      { id: 'student-1', name: 'Ana Souza' },
      { id: 'student-2', name: 'Bruno Lima' },
      { id: 'student-3', name: 'Carla Dias' },
    ],
  },
  {
    id: 'exam-2',
    title: 'Avaliação de História — Revolução Industrial',
    subject: 'História',
    className: '8º Ano A',
    code: 'HIS002',
    optionsCount: 5,
    questionCount: 8,
    dueDate: '2026-08-10',
    createdAt: '2026-07-18T10:00:00.000Z',
    priority: 'none',
    status: 'waiting',
    students: [
      { id: 'student-4', name: 'Diego Melo' },
      { id: 'student-5', name: 'Elaine Rocha' },
    ],
  },
  {
    id: 'exam-3',
    title: 'Simulado de Ciências — Ecologia',
    subject: 'Ciências',
    className: '7º Ano C',
    code: 'CIE003',
    optionsCount: 5,
    questionCount: 12,
    dueDate: '2026-08-05',
    createdAt: '2026-07-15T10:00:00.000Z',
    priority: 'medium',
    status: 'in_progress',
    students: [
      { id: 'student-6', name: 'Fabio Nunes' },
      { id: 'student-7', name: 'Gabriela Reis' },
      { id: 'student-8', name: 'Hugo Prado' },
      { id: 'student-9', name: 'Iris Castro' },
    ],
  },
];

export const mockExamProgress: Record<string, number> = {
  'exam-1': 0.25,
  'exam-3': 0.6,
};

// All 10 questions pre-filled, cycling through every option letter so the calibration sheet
// exercises every bubble column when scanned back.
export const mockAnswerKeys: AnswerKey[] = [
  {
    examId: CALIBRATION_EXAM_ID,
    answers: { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'A', 7: 'B', 8: 'C', 9: 'D', 10: 'E' },
  },
];
