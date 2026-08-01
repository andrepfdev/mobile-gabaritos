import { useMutation } from '@tanstack/react-query';
import { request } from './client';
import { useAuthStore } from '../store/authStore';
import { AuthResponse } from './types';

type RegisterInput = { name: string; email: string; password: string };
type LoginInput = { email: string; password: string };

export function useRegister() {
  const login = useAuthStore((s) => s.login);
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      request<AuthResponse>('/auth/register', {
        method: 'POST',
        auth: false,
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => login({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user),
  });
}

export function useLogin() {
  const login = useAuthStore((s) => s.login);
  return useMutation({
    mutationFn: (input: LoginInput) =>
      request<AuthResponse>('/auth/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => login({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user),
  });
}
