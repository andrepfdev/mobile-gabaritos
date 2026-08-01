import { useCurrentUser } from '../api/users';

export function useSubscriptionStatus() {
  const { data: user, isLoading, refetch } = useCurrentUser();
  const activeSubscription = user?.activeSubscription ?? null;
  const hasActiveSubscription = activeSubscription?.status === 'AUTHORIZED';
  // The account already had a subscription (activeSubscription is non-null) but it isn't
  // AUTHORIZED anymore — e.g. cancelled, past due, paused. Distinct from a user who never
  // subscribed at all (activeSubscription === null), who should keep the freemium flow.
  const hasLapsedSubscription = activeSubscription !== null && !hasActiveSubscription;

  return { isLoading, hasActiveSubscription, hasLapsedSubscription, activeSubscription, refetch };
}
