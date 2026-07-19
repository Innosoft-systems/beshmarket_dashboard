import { NextRequest, NextResponse } from 'next/server'

const ACCESS_TOKEN  = 'bm_access_token'
const REFRESH_TOKEN = 'bm_refresh_token'
const SEVEN_DAYS    = 7 * 24 * 60 * 60

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000') + '/api/v1'

// ── JWT helpers (Edge-runtime safe: atob, no Buffer) ──────────────────────────

function parseJwt(token: string): { exp?: number; role?: string } | null {
  try {
    const raw = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(raw))
  } catch {
    return null
  }
}

/** Returns true when the token is absent, malformed, or within 30 s of expiry. */
function isExpired(token: string | undefined): boolean {
  if (!token) return true
  const p = parseJwt(token)
  if (!p?.exp) return true
  return Date.now() / 1000 >= p.exp - 30
}

// ── Token refresh ─────────────────────────────────────────────────────────────

async function doRefresh(
  rt: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken: rt }),
      signal:  AbortSignal.timeout(5_000),
    })
    if (!res.ok) return null
    const json = await res.json()
    const data = json?.data ?? json
    if (data?.accessToken && data?.refreshToken) return data
    return null
  } catch {
    return null
  }
}

// ── Cookie writer ─────────────────────────────────────────────────────────────

function applyTokens(
  response: NextResponse,
  at: string,
  rt: string,
): void {
  const base = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax'  as const,
    path:     '/',
    maxAge:   SEVEN_DAYS,
  }
  response.cookies.set(ACCESS_TOKEN,  at, base)
  response.cookies.set(REFRESH_TOKEN, rt, base)
}

// ── Proxy ─────────────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pages that don't need an auth guard
  const isRestaurantLogin = pathname === '/restaurant/login'
  const isAdminLogin      = pathname === '/login'
  const isAuthPage        = isRestaurantLogin || isAdminLogin

  let at = request.cookies.get(ACCESS_TOKEN)?.value
  const rt = request.cookies.get(REFRESH_TOKEN)?.value

  // ── 1. Refresh access token when expired ────────────────────────────────────
  let refreshed: { accessToken: string; refreshToken: string } | null = null
  if (isExpired(at) && rt) {
    refreshed = await doRefresh(rt)
    if (refreshed) at = refreshed.accessToken
  }

  const authenticated = !isExpired(at)
  const role          = authenticated ? parseJwt(at!)?.role : undefined

  // ── 2. Unauthenticated → redirect to login ──────────────────────────────────
  if (!authenticated && !isAuthPage) {
    const isRestPanel = pathname === '/restaurant' || pathname.startsWith('/restaurant/')
    const loginPath = isRestPanel ? '/restaurant/login' : '/login'
    const url = new URL(loginPath, request.url)
    url.searchParams.set('from', pathname)
    const res = NextResponse.redirect(url)
    // Wipe stale cookies so the next visit starts clean
    res.cookies.delete(ACCESS_TOKEN)
    res.cookies.delete(REFRESH_TOKEN)
    return res
  }

  // ── 3. Already logged in → redirect away from login pages ──────────────────
  if (authenticated && isAuthPage) {
    let dest: string
    if (isRestaurantLogin) dest = role === 'admin' ? '/dashboard' : '/restaurant'
    else                   dest = role === 'restaurant' ? '/restaurant' : '/dashboard'

    const res = NextResponse.redirect(new URL(dest, request.url))
    if (refreshed) applyTokens(res, refreshed.accessToken, refreshed.refreshToken)
    return res
  }

  // ── 4. Role-based panel guard (prevents cross-panel access) ────────────────
  const isRestaurantPanel = pathname === '/restaurant' || pathname.startsWith('/restaurant/')
  const isAdminPanel = !isRestaurantPanel && !isAuthPage

  if (authenticated && isRestaurantPanel && role === 'admin') {
    const res = NextResponse.redirect(new URL('/dashboard', request.url))
    if (refreshed) applyTokens(res, refreshed.accessToken, refreshed.refreshToken)
    return res
  }
  if (authenticated && isAdminPanel && role === 'restaurant') {
    const res = NextResponse.redirect(new URL('/restaurant', request.url))
    if (refreshed) applyTokens(res, refreshed.accessToken, refreshed.refreshToken)
    return res
  }

  // ── 5. All good — continue and persist refreshed tokens if any ──────────────
  const requestHeaders = new Headers(request.headers)
  if (refreshed) {
    // Pass refreshed access token to server components via header
    requestHeaders.set('x-access-token', refreshed.accessToken)
  }
  const res = NextResponse.next({ request: { headers: requestHeaders } })
  if (refreshed) applyTokens(res, refreshed.accessToken, refreshed.refreshToken)
  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|sounds|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wav)$).*)',
  ],
}
