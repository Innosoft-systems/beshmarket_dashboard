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

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Refreshes in flight, keyed by the refresh token being spent. Tokens rotate, so
// concurrent 401s of one session must share a single refresh. This module is
// shared by every user of the server, so nothing here may outlive the request or
// be reachable without presenting that same refresh token.
const inflightRefreshes = new Map<string, Promise<TokenPair | null>>();

async function requestNewTokens(refreshToken: string): Promise<TokenPair | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;

    const json = await res.json();
    const tokens = json?.data ?? json;

    return tokens?.accessToken && tokens?.refreshToken
      ? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
      : null;
  } catch {
    return null;
  }
}

async function tryRefreshToken(): Promise<string | null> {
  // Read this request's own cookie before looking at any shared state.
  let refreshToken: string | undefined;
  try { refreshToken = await getRefreshToken(); } catch {}
  if (!refreshToken) return null;

  // No await between get and set, so two callers cannot both start a refresh.
  const key = refreshToken;
  let refresh = inflightRefreshes.get(key);
  if (!refresh) {
    // Chained .finally always runs after the set below, even if fetch throws synchronously.
    refresh = requestNewTokens(key).finally(() => { inflightRefreshes.delete(key); });
    inflightRefreshes.set(key, refresh);
  }

  const tokens = await refresh;
  if (!tokens) return null;

  // Cookies belong to a request, so every caller writes its own: the one that
  // started the refresh may be a render, which is not allowed to set cookies.
  try { await setAuthTokens(tokens.accessToken, tokens.refreshToken); } catch {}
  return tokens.accessToken;
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
  let response: Response;

  try {
    response = await fetch(url, fetchOptions);
  } catch (networkErr) {
    // A POST is not idempotent: the first attempt may have reached the server
    // (e.g. a 1C connection create whose one-time secret would then be lost to
    // a 409 on the retry). Surface the error instead.
    if (method === 'POST') throw networkErr;
    // Retry once on network-level failure (DNS, connection reset, etc.)
    await new Promise(r => setTimeout(r, 500));
    response = await fetch(url, fetchOptions);
  }

  // 401 — refresh this session's token (shared with its concurrent requests) and replay
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
