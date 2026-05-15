import { getRefreshToken, setAuthTokens } from "@/lib/auth/session";

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1`;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  accessToken?: string;
  tags?: string[];
  revalidate?: number;
}

interface ApiResponse<T> {
  data: T;
  status: number;
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function tryRefreshToken(): Promise<string | null> {
  try {
    const refreshToken = await getRefreshToken();
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
      await setAuthTokens(tokens.accessToken, tokens.refreshToken);
      return tokens.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, accessToken, tags, revalidate } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
    ...(tags || revalidate !== undefined
      ? { next: { ...(tags ? { tags } : {}), ...(revalidate !== undefined ? { revalidate } : {}) } }
      : { cache: 'no-store' }),
  };

  const url = `${API_BASE_URL}${endpoint}`;
  let response = await fetch(url, fetchOptions);

  // 401 — try refresh token
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
