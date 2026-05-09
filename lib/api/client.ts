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

/** NestJS TransformInterceptor wraps all responses */
interface NestResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
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
      : {}),
  };

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    let message = `HTTP Error ${response.status}`;
    try {
      const errorBody = await response.json();
      // NestJS error format: {success, statusCode, error, timestamp}
      message = errorBody?.error ?? errorBody?.message ?? message;
    } catch {
      // ignore parse error
    }
    throw new ApiError(response.status, message);
  }

  const json = await response.json();

  // Unwrap NestJS TransformInterceptor: {success, data, timestamp} → data
  const data: T = json?.data !== undefined ? json.data : json;

  return { data, status: response.status };
}

