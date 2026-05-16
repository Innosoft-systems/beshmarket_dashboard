import { apiRequest, ApiError } from './client';
import type { AdminLoginPayload, AdminLoginResponse, AuthTokens, CurrentUser, OtpLoginResponse } from '@/types/auth';

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

export async function sendOtp(phone: string): Promise<{ message: string; phone: string }> {
  const { data } = await apiRequest<{ message: string; phone: string }>('/auth/send-otp', {
    method: 'POST',
    body: { phone },
  });
  return data;
}

export async function verifyOtp(phone: string, code: string): Promise<OtpLoginResponse> {
  const { data } = await apiRequest<OtpLoginResponse>('/auth/verify-otp', {
    method: 'POST',
    body: { phone, code },
  });
  return data;
}

export async function getMe(accessToken: string): Promise<CurrentUser> {
  const { data } = await apiRequest<CurrentUser>('/auth/me', { accessToken });
  return data;
}

export { ApiError };
