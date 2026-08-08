import { cookies, headers } from 'next/headers';

const ACCESS_TOKEN_KEY = 'bm_access_token';
const REFRESH_TOKEN_KEY = 'bm_refresh_token';

const ONE_MINUTE = 60;
const SEVEN_DAYS = 7 * 24 * 60 * ONE_MINUTE;

export async function getAccessToken(): Promise<string | undefined> {
  // Middleware passes refreshed token via header when cookie is stale
  const h = await headers()
  const fromHeader = h.get('x-access-token')
  if (fromHeader) return fromHeader

  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_KEY)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_KEY)?.value;
}

export async function setAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_TOKEN_KEY, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SEVEN_DAYS,
    path: '/',
  });

  cookieStore.set(REFRESH_TOKEN_KEY, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SEVEN_DAYS,
    path: '/',
  });
}

export async function clearAuthTokens(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_KEY);
  cookieStore.delete(REFRESH_TOKEN_KEY);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken();
  return !!token;
}

/**
 * Role claim from the session's access token.
 *
 * The signature is not verified here — the backend does that on every request.
 * This exists so server actions can enforce the same role boundary that
 * `middleware.ts` applies to page paths, since actions are dispatched by action
 * id and never pass through the path-based guard.
 */
export async function getSessionRole(): Promise<string | undefined> {
  const token = await getAccessToken();
  if (!token) return undefined;

  try {
    const segment = token.split('.')[1];
    if (!segment) return undefined;
    const json = Buffer.from(
      segment.replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8');
    const payload = JSON.parse(json) as { role?: string };
    return typeof payload.role === 'string' ? payload.role : undefined;
  } catch {
    return undefined;
  }
}
