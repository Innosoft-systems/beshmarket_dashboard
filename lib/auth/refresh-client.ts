// Client-side token refresh — calls the /api/refresh route handler
//
// Refresh tokens rotate, and the backend keeps one per account: two refreshes
// sent with the same token race, and the loser logs the user out (now or at
// the next refresh). So:
// - within a tab, every caller (sockets, bells, the presence beat) shares one
//   in-flight refresh;
// - across tabs and windows of the same browser, a Web Lock lets one refresh
//   at a time, and /api/refresh hands a tab the token another tab just got;
// - a server that cannot answer (5xx, timeout, offline) is retried with
//   backoff and the session is kept. Only a definite 401 resolves to null,
//   which callers treat as "logged out".
//
// The resolved value is the new access token, or null when the session is over.

const LOCK_NAME = "bm-auth-refresh"
const RETRY_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 20_000, 30_000]

type Attempt =
  | { kind: "ok"; token: string; reused: boolean }
  | { kind: "unauthorized" }
  | { kind: "unavailable" }

let inflight: Promise<string | null> | null = null
/** The last token this tab obtained here; see the `force` retry below. */
let lastObtained: string | null = null

async function attempt(force: boolean): Promise<Attempt> {
  try {
    const res = await fetch("/api/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force }),
      cache: "no-store",
    })
    if (res.status === 401) return { kind: "unauthorized" }
    if (!res.ok) return { kind: "unavailable" }
    const json = await res.json()
    if (typeof json?.accessToken !== "string") return { kind: "unavailable" }
    return { kind: "ok", token: json.accessToken, reused: json.reused === true }
  } catch {
    return { kind: "unavailable" }
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

async function refreshUntilSettled(): Promise<string | null> {
  for (let i = 0; ; i++) {
    let result = await attempt(false)
    // Handed back the very token this tab already got and is now asking to
    // replace (e.g. the server refused it): ask for a real refresh.
    if (result.kind === "ok" && result.reused && result.token === lastObtained) {
      result = await attempt(true)
    }
    if (result.kind === "ok") {
      lastObtained = result.token
      return result.token
    }
    if (result.kind === "unauthorized") return null
    await sleep(RETRY_DELAYS_MS[Math.min(i, RETRY_DELAYS_MS.length - 1)])
  }
}

function withCrossTabLock(fn: () => Promise<string | null>): Promise<string | null> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined
  if (!locks?.request) return fn()
  // The lock resolves with the callback's promise; `then` unwraps it for the types.
  return locks.request(LOCK_NAME, fn).then((token) => token)
}

export function refreshAccessToken(): Promise<string | null> {
  if (!inflight) {
    inflight = withCrossTabLock(refreshUntilSettled).finally(() => {
      inflight = null
    })
  }
  return inflight
}

/** Test hook: forget module state between tests. */
export function __resetRefreshClientForTests(): void {
  inflight = null
  lastObtained = null
}
