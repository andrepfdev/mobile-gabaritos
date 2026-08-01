import { useExamStore } from '../store/examStore';
import { useSubscriptionStatus } from './useSubscriptionStatus';

export const FREE_EXAM_LIMIT = 3;

export function useCanCreateExam() {
  const examCount = useExamStore((s) => s.exams.length);
  const { hasActiveSubscription } = useSubscriptionStatus();

  return {
    canCreate: hasActiveSubscription || examCount < FREE_EXAM_LIMIT,
    examCount,
    limit: FREE_EXAM_LIMIT,
    hasActiveSubscription,
  };
}
