import { useQuery } from '@tanstack/react-query';
import { authedRequest } from './authInterceptor';
import { Payment } from './types';

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: () => authedRequest<Payment[]>('/payments/me'),
  });
}
