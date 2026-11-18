import { NextRequest, NextResponse } from 'next/server'
import { classifyRefreshStatus, isExpired, parseJwt, type RefreshFailure } from '@/lib/auth/token'

const ACCESS_TOKEN  = 'bm_access_token'
const REFRESH_TOKEN = 'bm_refresh_token'
const SEVEN_DAYS    = 7 * 24 * 60 * 60

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000') + '/api/v1'

/**
 * The restaurant panel's presence beat (every 30 s, and on every focus/online
 * edge). It must not refresh tokens here: firing at the same moment as the
 * sockets' client refresh, it raced them with the same refresh token and the
 * loser logged the venue out. The route answers 401 on a stale token and the
 * client refreshes through its single, cross-tab refresh.
 */
const PRESENCE_PATH = '/restaurant/presence'

// ── Token refresh ─────────────────────────────────────────────────────────────

type RefreshResult =
  | { kind: 'ok'; accessToken: string; refreshToken: string }
  | { kind: RefreshFailure }

async function doRefresh(rt: string): Promise<RefreshResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken: rt }),
      signal:  AbortSignal.timeout(5_000),
    })
    if (!res.ok) return { kind: classifyRefreshStatus(res.status) }
    const json = await res.json()
    const data = json?.data ?? json
    if (data?.accessToken && data?.refreshToken) {
      return { kind: 'ok', accessToken: data.accessToken, refreshToken: data.refreshToken }
    }
    return { kind: 'unavailable' }
  } catch {
    // Timeout or network error: the server is unreachable, the session is not wrong.
    return { kind: 'unavailable' }
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

// ── Server unavailable: keep the session, say so, retry ──────────────────────

const RETRY_AFTER_SECONDS = 15

const UNAVAILABLE_HTML = `<!doctype html>
<html lang="uz"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="${RETRY_AFTER_SECONDS}">
<title>Server bilan aloqa yo'q</title>
<style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:16px;background:#f8fafc;color:#0f172a;text-align:center}p{color:#475569}</style>
</head><body><main>
<h1>Server bilan aloqa yo'q</h1>
<p>Siz tizimdan chiqmadingiz. Sahifa ${RETRY_AFTER_SECONDS} soniyadan keyin o'zi yangilanadi.</p>
</main></body></html>`

function serviceUnavailable(request: NextRequest): NextResponse {
  const headers = { 'Cache-Control': 'no-store', 'Retry-After': String(RETRY_AFTER_SECONDS) }
  const isDocument =
    request.method === 'GET' &&
    !request.headers.has('rsc') &&
    !request.headers.has('next-action') &&
    (request.headers.get('accept') ?? '').includes('text/html')
  if (isDocument) {
    return new NextResponse(UNAVAILABLE_HTML, {
      status: 503,
      headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
  return NextResponse.json({ error: "Server bilan aloqa yo'q" }, { status: 503, headers })
}

// ── Middleware ────────────────────────────────────────────────────────────────

/** Request headers without a client-supplied `x-access-token` (see step 5). */
function trustedHeaders(request: NextRequest): Headers {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete('x-access-token')
  return requestHeaders
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === PRESENCE_PATH) {
    return NextResponse.next({ request: { headers: trustedHeaders(request) } })
  }

  // Pages that don't need an auth guard
  const isRestaurantLogin = pathname === '/restaurant/login'
  const isAdminLogin      = pathname === '/login'
  const isAuthPage        = isRestaurantLogin || isAdminLogin

  let at = request.cookies.get(ACCESS_TOKEN)?.value
  const rt = request.cookies.get(REFRESH_TOKEN)?.value

  // ── 1. Refresh access token when expired ────────────────────────────────────
  let refreshed: { accessToken: string; refreshToken: string } | null = null
  let refreshUnavailable = false
  if (isExpired(at) && rt) {
    const result = await doRefresh(rt)
    if (result.kind === 'ok') {
      refreshed = { accessToken: result.accessToken, refreshToken: result.refreshToken }
      at = refreshed.accessToken
    } else if (result.kind === 'unavailable') {
      refreshUnavailable = true
    }
  }

  const authenticated = !isExpired(at)
  const role          = authenticated ? parseJwt(at!)?.role : undefined

  // ── 2. Unauthenticated → redirect to login ──────────────────────────────────
  if (!authenticated && !isAuthPage) {
    // The server could not answer: the session may be perfectly valid. Keep the
    // cookies and ask to retry instead of logging the user out.
    if (refreshUnavailable) return serviceUnavailable(request)

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
    if (role === 'admin') dest = '/dashboard'
    else if (role === 'restaurant') dest = '/restaurant'
    else {
      const res = NextResponse.next()
      res.cookies.delete(ACCESS_TOKEN)
      res.cookies.delete(REFRESH_TOKEN)
      return res
    }

    const res = NextResponse.redirect(new URL(dest, request.url))
    if (refreshed) applyTokens(res, refreshed.accessToken, refreshed.refreshToken)
    return res
  }

  // ── 4. Role-based panel guard (prevents cross-panel access) ────────────────
  const isRestaurantPanel = pathname === '/restaurant' || pathname.startsWith('/restaurant/')
  const isAdminPanel = !isRestaurantPanel && !isAuthPage

  if (authenticated && isRestaurantPanel && role !== 'restaurant') {
    const destination = role === 'admin' ? '/dashboard' : '/restaurant/login'
    const res = NextResponse.redirect(new URL(destination, request.url))
    if (role !== 'admin') {
      res.cookies.delete(ACCESS_TOKEN)
      res.cookies.delete(REFRESH_TOKEN)
    }
    if (refreshed && role === 'admin') applyTokens(res, refreshed.accessToken, refreshed.refreshToken)
    return res
  }
  if (authenticated && isAdminPanel && role !== 'admin') {
    const destination = role === 'restaurant' ? '/restaurant' : '/login'
    const res = NextResponse.redirect(new URL(destination, request.url))
    if (role !== 'restaurant') {
      res.cookies.delete(ACCESS_TOKEN)
      res.cookies.delete(REFRESH_TOKEN)
    }
    if (refreshed && role === 'restaurant') applyTokens(res, refreshed.accessToken, refreshed.refreshToken)
    return res
  }

  // ── 5. All good — continue and persist refreshed tokens if any ──────────────
  // getAccessToken() trusts this header over the cookie, so a client-supplied one
  // would let anybody hand server components/actions a forged role claim.
  // Only middleware may set it.
  const requestHeaders = trustedHeaders(request)
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
