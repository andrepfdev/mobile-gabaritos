import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authedRequest } from './authInterceptor';
import { useAuthStore } from '../store/authStore';
import { UserWithSubscription } from './types';

export function useCurrentUser() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['me'],
    queryFn: () => authedRequest<UserWithSubscription>('/users/me'),
    enabled: isAuthenticated,
  });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; email?: string }) =>
      authedRequest<UserWithSubscription>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      authedRequest<void>('/users/me/password', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  });
}
