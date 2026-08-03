import { useExamStore } from '../store/examStore';
import { useSubscriptionStatus } from './useSubscriptionStatus';

export const FREE_EXAM_LIMIT = 3;

export function useCanCreateExam() {
  const totalExamCount = useExamStore((s) => s.totalExamCount);
  const { hasActiveSubscription } = useSubscriptionStatus();

  return {
    canCreate: hasActiveSubscription || totalExamCount < FREE_EXAM_LIMIT,
    examCount: totalExamCount,
    limit: FREE_EXAM_LIMIT,
    hasActiveSubscription,
  };
}
