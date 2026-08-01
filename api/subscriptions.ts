import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authedRequest } from './authInterceptor';
import { Subscription } from './types';

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: () => authedRequest<Subscription>('/subscriptions/me'),
    retry: false,
  });
}

// NOTE: there is intentionally no `useSubscribe`/checkout mutation here. Subscribing happens
// entirely on the web — starting a purchase flow or linking out to it from inside the app would
// violate App Store Guideline 3.1.1 and Google Play's Payments Policy for digital goods.

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authedRequest<void>('/subscriptions/me', { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
