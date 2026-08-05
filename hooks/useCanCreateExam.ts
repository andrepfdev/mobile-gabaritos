import { useExamStore } from '../store/examStore';
import { useSubscriptionStatus } from './useSubscriptionStatus';

export const FREE_EXAM_LIMIT = 5;

export function useCanCreateExam() {
  // totalExamCount excludes the seeded "Prova de Calibragem" (see countAllExams in
  // lib/db/examsRepository.ts) — it doesn't count against the free plan limit.
  const totalExamCount = useExamStore((s) => s.totalExamCount);
  const { hasActiveSubscription } = useSubscriptionStatus();

  return {
    canCreate: hasActiveSubscription || totalExamCount < FREE_EXAM_LIMIT,
    examCount: totalExamCount,
    limit: FREE_EXAM_LIMIT,
    hasActiveSubscription,
  };
}
