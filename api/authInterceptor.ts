import { ApiError, request, RequestOptions } from './client';
import { clearTokens, getRefreshToken, setTokens } from './tokenStorage';

type TokenPair = { accessToken: string; refreshToken: string };

let refreshPromise: Promise<TokenPair> | null = null;

async function refreshTokens(): Promise<TokenPair> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw { status: 401, message: 'Sessão expirada.' } satisfies ApiError;
  }
  const tokens = await request<TokenPair>('/auth/refresh', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ refreshToken }),
  });
  await setTokens(tokens.accessToken, tokens.refreshToken);
  return tokens;
}

let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

export async function authedRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await request<T>(path, options);
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.status !== 401 || path === '/auth/refresh') {
      throw error;
    }

    try {
      refreshPromise = refreshPromise ?? refreshTokens();
      await refreshPromise;
    } catch (refreshError) {
      await clearTokens();
      onSessionExpired?.();
      throw refreshError;
    } finally {
      refreshPromise = null;
    }

    return request<T>(path, options);
  }
}
