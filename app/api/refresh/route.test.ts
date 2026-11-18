/**
 * @jest-environment node
 */
import { POST } from "./route"
import { makeJwt } from "@/lib/auth/test-jwt"

const jar = new Map<string, string>()
const setCalls: Array<[string, string]> = []
jest.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined),
    set: (k: string, v: string) => {
      setCalls.push([k, v])
      jar.set(k, v)
    },
    delete: (k: string) => jar.delete(k),
  }),
  headers: async () => new Headers(),
}))

const fetchMock = jest.fn()
beforeEach(() => {
  jar.clear()
  setCalls.length = 0
  fetchMock.mockReset()
  global.fetch = fetchMock as unknown as typeof fetch
})

const call = (body?: unknown) =>
  POST(new Request("http://localhost/api/refresh", { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }))
const backend = (status: number, body: unknown = {}) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }))

describe("/api/refresh", () => {
  it("hands back an access token another tab just obtained, without rotating again (F3)", async () => {
    const fresh = makeJwt({ iatAgo: 3 })
    jar.set("bm_access_token", fresh)
    jar.set("bm_refresh_token", "rt2")
    const res = await call()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ accessToken: fresh, reused: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("force skips the reuse and really refreshes", async () => {
    jar.set("bm_access_token", makeJwt({ iatAgo: 3 }))
    jar.set("bm_refresh_token", "rt2")
    const next = makeJwt()
    backend(201, { data: { accessToken: next, refreshToken: "rt3" } })
    const res = await call({ force: true })
    expect(await res.json()).toEqual({ accessToken: next })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ refreshToken: "rt2" })
    expect(setCalls).toEqual([
      ["bm_access_token", next],
      ["bm_refresh_token", "rt3"],
    ])
  })

  it("an old (not freshly issued) access token is refreshed normally", async () => {
    jar.set("bm_access_token", makeJwt({ iatAgo: 900, expIn: 0 }))
    jar.set("bm_refresh_token", "rt1")
    backend(201, { data: { accessToken: makeJwt(), refreshToken: "rt2" } })
    expect((await call()).status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("401 when there is no refresh token or the backend refuses it", async () => {
    expect((await call()).status).toBe(401)
    jar.set("bm_refresh_token", "rt1")
    backend(401)
    expect((await call()).status).toBe(401)
    expect(setCalls).toEqual([])
  })

  it.each([
    ["backend 500", () => backend(500)],
    ["backend 429", () => backend(429)],
    ["timeout", () => fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"))],
    ["bad body", () => backend(201, { data: {} })],
  ])("503 (session kept) on %s", async (_label, arrange) => {
    jar.set("bm_refresh_token", "rt1")
    arrange()
    const res = await call()
    expect(res.status).toBe(503)
    expect(setCalls).toEqual([])
  })
})
