import { apiRequest, ApiError } from './client';
import type { AdminLoginPayload, AdminLoginResponse, AuthTokens } from '@/types/auth';

export async function adminLogin(payload: AdminLoginPayload): Promise<AdminLoginResponse> {
  const { data } = await apiRequest<AdminLoginResponse>('/auth/admin/login', {
    method: 'POST',
    body: payload,
  });
  return data;
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  const { data } = await apiRequest<AuthTokens>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  });
  return data;
}

export { ApiError };
