import { getRefreshToken, setAuthTokens } from "@/lib/auth/session";
export { ApiError } from "./errors";
import { ApiError } from "./errors";

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1`;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  accessToken?: string;
  tags?: string[];
  revalidate?: number;
  signal?: AbortSignal;
}

interface ApiResponse<T> {
  data: T;
  status: number;
}

// Singleton mutex: prevents concurrent 401 handlers from firing multiple refreshes
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;

      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) return null;

      const json = await res.json();
      const tokens = json?.data ?? json;

      if (tokens?.accessToken && tokens?.refreshToken) {
        try { await setAuthTokens(tokens.accessToken, tokens.refreshToken); } catch {}
        return tokens.accessToken as string;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, accessToken, tags, revalidate, signal } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Combine caller signal with 30s timeout
  const timeoutSignal = AbortSignal.timeout(30_000);
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;

  const fetchOptions: RequestInit = {
    method,
    headers,
    signal: combinedSignal,
    ...(body ? { body: JSON.stringify(body) } : {}),
    ...(tags || revalidate !== undefined
      ? { next: { ...(tags ? { tags } : {}), ...(revalidate !== undefined ? { revalidate } : {}) } }
      : { cache: 'no-store' }),
  };

  const url = `${API_BASE_URL}${endpoint}`;
  let response = await fetch(url, fetchOptions);

  // 401 — try refresh token (mutex-protected)
  if (response.status === 401 && accessToken) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, { ...fetchOptions, headers });
    }
  }

  if (!response.ok) {
    let message = `HTTP Error ${response.status}`;
    try {
      const errorBody = await response.json();
      message = errorBody?.error ?? errorBody?.message ?? message;
    } catch {
      // ignore parse error
    }
    throw new ApiError(response.status, message);
  }

  const json = await response.json();
  const data: T = json?.data !== undefined ? json.data : json;

  return { data, status: response.status };
}
