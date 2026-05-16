import { getRmRefreshToken, setRmTokens } from '@/lib/auth/restaurant-session';
import { ApiError } from '@/lib/api/client';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1`;

async function tryRmRefresh(): Promise<string | null> {
  try {
    const refreshToken = await getRmRefreshToken();
    if (!refreshToken) return null;

    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;

    const json = await res.json();
    const tokens = json?.data ?? json;
    if (tokens?.accessToken && tokens?.refreshToken) {
      await setRmTokens(tokens.accessToken, tokens.refreshToken);
      return tokens.accessToken;
    }
  } catch {}
  return null;
}

export async function rmApiRequest<T>(
  endpoint: string,
  options: { method?: string; body?: unknown; accessToken?: string } = {},
): Promise<{ data: T }> {
  const { method = 'GET', body, accessToken } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const init: RequestInit = {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  };

  let res = await fetch(`${API_BASE_URL}${endpoint}`, init);

  if (res.status === 401 && accessToken) {
    const newToken = await tryRmRefresh();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE_URL}${endpoint}`, { ...init, headers });
    }
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const e = await res.json(); msg = e?.error ?? e?.message ?? msg; } catch {}
    throw new ApiError(res.status, msg);
  }

  const json = await res.json();
  return { data: json?.data !== undefined ? json.data : json };
}
