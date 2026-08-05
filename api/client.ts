import Constants from 'expo-constants';
import { getAccessToken } from './tokenStorage';

const BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://api.provazero.app.br';

export type ApiError = {
  status: number;
  message: string;
  issues?: { path: string; message: string }[];
};

export type RequestOptions = RequestInit & { auth?: boolean };

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = await getAccessToken();
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...rest, headers: finalHeaders });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => undefined);

  if (!response.ok) {
    const error: ApiError = {
      status: response.status,
      message: body?.message ?? 'Erro inesperado ao comunicar com o servidor.',
      issues: body?.issues,
    };
    throw error;
  }

  return body as T;
}
