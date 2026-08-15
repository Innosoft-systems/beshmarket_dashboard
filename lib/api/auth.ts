import { apiRequest, ApiError } from './client';
import type { AdminLoginPayload, AdminLoginResponse, AuthTokens, CurrentUser, RestaurantLoginPayload, RestaurantLoginResponse } from '@/types/auth';

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

export async function restaurantLogin(payload: RestaurantLoginPayload): Promise<RestaurantLoginResponse> {
  const { data } = await apiRequest<RestaurantLoginResponse>('/auth/restaurant/login', {
    method: 'POST',
    body: payload,
  });
  return data;
}

export async function getMe(accessToken: string): Promise<CurrentUser> {
  const { data } = await apiRequest<CurrentUser>('/auth/me', { accessToken });
  return data;
}

export { ApiError };
