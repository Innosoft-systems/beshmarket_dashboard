// Client-side token refresh — calls the /api/refresh route handler
//
// Refresh tokens rotate, and several sockets (admin hook, order hook, bells,
// chat) are dropped by the server at the same instant when the access token
// expires. Share one in-flight request so they do not race each other with the
// same refresh token and invalidate the session.
let inflight: Promise<string | null> | null = null

export function refreshAccessToken(): Promise<string | null> {
  if (!inflight) {
    inflight = (async () => {
      try {
        const res = await fetch("/api/refresh", { method: "POST" })
        if (!res.ok) return null
        const json = await res.json()
        return json.accessToken ?? null
      } catch {
        return null
      }
    })().finally(() => {
      inflight = null
    })
  }
  return inflight
}
