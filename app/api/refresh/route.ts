import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getRefreshToken, setAuthTokens } from "@/lib/auth/session"
import { classifyRefreshStatus, isFreshlyIssued } from "@/lib/auth/token"

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1`
const ACCESS_TOKEN_KEY = "bm_access_token"

const noStore = { "Cache-Control": "no-store" }
const unauthorized = () => NextResponse.json({ error: "Refresh failed" }, { status: 401, headers: noStore })
const unavailable = () => NextResponse.json({ error: "Server bilan aloqa yo'q" }, { status: 503, headers: noStore })

/**
 * Client-side token refresh (see lib/auth/refresh-client.ts).
 *
 * 401 means the session is over (the client sends the user to login); 503
 * means the server could not answer and the client retries with the session
 * kept.
 *
 * Tabs that hit the token expiry together queue on a browser lock, but each
 * still calls here. When another tab (or the middleware) has just put a fresh
 * access token into the cookie, that token is returned without rotating the
 * refresh token again. `force` skips this for a caller that already holds
 * that token and still needs a new one.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { force?: unknown } | null
  const force = body?.force === true

  const cookieStore = await cookies()
  // Read the cookie itself: /api is outside the middleware, so a request header
  // here is whatever the client sent.
  const currentAccess = cookieStore.get(ACCESS_TOKEN_KEY)?.value
  if (!force && currentAccess && isFreshlyIssued(currentAccess)) {
    return NextResponse.json({ accessToken: currentAccess, reused: true }, { headers: noStore })
  }

  const refreshToken = await getRefreshToken()
  if (!refreshToken) return unauthorized()

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return unavailable()
  }

  if (!res.ok) {
    return classifyRefreshStatus(res.status) === "unauthorized" ? unauthorized() : unavailable()
  }

  const json = await res.json().catch(() => null)
  const tokens = json?.data ?? json
  if (!tokens?.accessToken || !tokens?.refreshToken) return unavailable()

  await setAuthTokens(tokens.accessToken, tokens.refreshToken)
  return NextResponse.json({ accessToken: tokens.accessToken }, { headers: noStore })
}
