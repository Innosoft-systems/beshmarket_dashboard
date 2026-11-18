// Token helpers shared by the middleware (Edge runtime), route handlers and
// tests. Edge-safe: atob, no Buffer. Signatures are not verified here; the
// backend does that on every request.

export interface JwtClaims {
  exp?: number
  iat?: number
  role?: string
}

export function parseJwt(token: string): JwtClaims | null {
  try {
    const raw = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(raw))
  } catch {
    return null
  }
}

const nowSec = () => Date.now() / 1000

/** True when the token is absent, malformed, or within `skewSec` of expiry. */
export function isExpired(token: string | undefined, skewSec = 30): boolean {
  if (!token) return true
  const p = parseJwt(token)
  if (!p?.exp) return true
  return nowSec() >= p.exp - skewSec
}

/**
 * True for an access token another tab or request has only just obtained:
 * issued within `withinSec` and not close to expiry. `/api/refresh` hands such
 * a token back instead of rotating the refresh token again, so tabs that hit
 * the expiry together do not race each other with the same refresh token.
 */
export function isFreshlyIssued(token: string | undefined, withinSec = 60): boolean {
  if (!token) return false
  const p = parseJwt(token)
  if (!p?.exp || !p?.iat) return false
  const now = nowSec()
  return now - p.iat <= withinSec && p.exp - now > withinSec
}

/**
 * What a failed `POST /auth/refresh` means. Only a token problem (400 bad
 * token, 401 revoked/expired, 403) ends the session. A 5xx, 429, timeout or
 * network error is the server being unavailable: the backend answers 5xx on
 * purpose then (B7) so the session is kept, and the client retries.
 */
export type RefreshFailure = "unauthorized" | "unavailable"

export function classifyRefreshStatus(status: number): RefreshFailure {
  return status === 400 || status === 401 || status === 403 ? "unauthorized" : "unavailable"
}
