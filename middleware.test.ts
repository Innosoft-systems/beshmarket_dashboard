/** @jest-environment node */
import { NextRequest } from "next/server"
import { config, middleware } from "./middleware"
import { makeJwt } from "@/lib/auth/test-jwt"

const call = (path: string, method = "GET") =>
  middleware(new NextRequest(`http://localhost:3000${path}`, { method }))

describe("the messaging service worker", () => {
  it.each(["GET", "HEAD"])("is served without a session (%s)", async (method) => {
    const res = await call("/firebase-messaging-sw.js", method)
    expect(res.status).toBe(200)
    expect(res.headers.get("x-middleware-next")).toBe("1")
    expect(res.headers.get("set-cookie")).toBeNull()
  })

  it("is open for reads only", async () => {
    const res = await call("/firebase-messaging-sw.js", "POST")
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login")
  })

  it.each(["/firebase-messaging-sw.js.map", "/x/firebase-messaging-sw.js", "/other.js"])("does not open up %s", async (path) => {
    expect((await call(path)).status).toBe(307)
  })

  it("still passes through the guard's matcher", () => {
    expect(new RegExp(`^${config.matcher[0]}$`).test("/firebase-messaging-sw.js")).toBe(true)
  })
})

// ── Session refresh (F1) and the presence beat (F2) ──────────────────────────

const fetchMock = jest.fn()
beforeEach(() => {
  fetchMock.mockReset()
  global.fetch = fetchMock as unknown as typeof fetch
})

const STALE = makeJwt({ iatAgo: 1000, expIn: -100 })

function req(path: string, opts: { at?: string; rt?: string; headers?: Record<string, string>; method?: string } = {}) {
  const cookies = [opts.at && `bm_access_token=${opts.at}`, opts.rt && `bm_refresh_token=${opts.rt}`].filter(Boolean).join("; ")
  return new NextRequest(`http://localhost:3000${path}`, {
    method: opts.method ?? "GET",
    headers: { accept: "text/html", ...(cookies ? { cookie: cookies } : {}), ...opts.headers },
  })
}

const backend = (status: number, body: unknown = {}) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }))

/** Cookies the response deletes (Max-Age=0 / expired). */
function deleted(res: Response): string[] {
  return (res.headers.getSetCookie?.() ?? [])
    .filter((c) => /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(c))
    .map((c) => c.split("=")[0])
}

describe("middleware refresh (F1)", () => {
  it("a definite 401 from /auth/refresh logs out: redirect to the panel login and wipe cookies", async () => {
    backend(401, { error: "Refresh token noto'g'ri" })
    const res = await middleware(req("/restaurant/orders", { at: STALE, rt: "rt1" }))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("http://localhost:3000/restaurant/login?from=%2Frestaurant%2Forders")
    expect(deleted(res).sort()).toEqual(["bm_access_token", "bm_refresh_token"])
  })

  it("a backend 5xx keeps the session: 503 page that retries, no cookie deleted, no redirect", async () => {
    backend(500, { error: "Mongo down" })
    const res = await middleware(req("/restaurant", { at: STALE, rt: "rt1" }))
    expect(res.status).toBe(503)
    expect(res.headers.get("content-type")).toMatch(/text\/html/)
    expect(res.headers.get("retry-after")).toBe("15")
    const html = await res.text()
    expect(html).toContain("Siz tizimdan chiqmadingiz")
    expect(html).toContain('http-equiv="refresh"')
    expect(deleted(res)).toEqual([])
  })

  it("a timeout or network error is treated the same; fetch/RSC requests get JSON", async () => {
    fetchMock.mockRejectedValue(new DOMException("The operation timed out", "TimeoutError"))
    const res = await middleware(req("/dashboard", { at: STALE, rt: "rt1", headers: { rsc: "1", accept: "*/*" } }))
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: "Server bilan aloqa yo'q" })
    expect(deleted(res)).toEqual([])
  })

  it("a refresh that succeeds sets both cookies and hands the token to the page", async () => {
    const fresh = makeJwt()
    backend(201, { success: true, data: { accessToken: fresh, refreshToken: "rt2" } })
    const res = await middleware(req("/restaurant", { at: STALE, rt: "rt1" }))
    expect(res.headers.get("x-middleware-request-x-access-token")).toBe(fresh)
    const set = res.headers.getSetCookie().join("\n")
    expect(set).toContain(`bm_access_token=${fresh}`)
    expect(set).toContain("bm_refresh_token=rt2")
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("without a refresh token: straight to login, nothing to retry", async () => {
    const res = await middleware(req("/restaurant", {}))
    expect(res.status).toBe(307)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("the login page stays reachable while the server is down (no wipe)", async () => {
    backend(503)
    const res = await middleware(req("/restaurant/login", { at: STALE, rt: "rt1" }))
    expect(res.status).toBe(200)
    expect(deleted(res)).toEqual([])
  })
})

describe("presence beat (F2)", () => {
  it("never refreshes or redirects, even with a stale token, and drops a forged x-access-token", async () => {
    const res = await middleware(
      req("/restaurant/presence", { at: STALE, rt: "rt1", method: "POST", headers: { "x-access-token": "forged" } }),
    )
    expect(fetchMock).not.toHaveBeenCalled()
    expect(res.status).toBe(200)
    expect(res.headers.get("location")).toBeNull()
    expect(deleted(res)).toEqual([])
    expect(res.headers.get("x-middleware-request-x-access-token")).toBeNull()
    expect(res.headers.get("x-middleware-override-headers")).not.toMatch(/x-access-token/)
  })
})
