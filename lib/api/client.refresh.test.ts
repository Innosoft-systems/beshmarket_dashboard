/** @jest-environment node */
import { AsyncLocalStorage } from "node:async_hooks"

// The module under test is one instance for every user of the Next.js server, so
// each "request" here runs in its own async context, like cookies() does there.
interface RequestContext {
  refreshCookie?: string
  /** Server Components cannot write cookies; Server Actions / Route Handlers can. */
  readOnly?: boolean
  written: Array<[string, string]>
}
const mockRequest = new AsyncLocalStorage<RequestContext>()

const getRefreshToken = jest.fn<Promise<string | undefined>, []>()
const setAuthTokens = jest.fn<Promise<void>, [string, string]>()
jest.mock("@/lib/auth/session", () => ({
  getRefreshToken: () => getRefreshToken(),
  setAuthTokens: (at: string, rt: string) => setAuthTokens(at, rt),
}))

/** Re-imported per test, so one test's in-flight refresh cannot affect the next. */
let apiRequest: typeof import("./client").apiRequest

const reply = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body }) as unknown as Response

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((r) => (resolve = r))
  return { promise, resolve }
}

/** Enough turns of the event loop for every request to get as far as it can. */
const settle = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r))
}

/** Backend with rotating refresh tokens: one use each, `rt-<user>-<n>` → `at-<user>-<n+1>`. */
function fakeBackend() {
  const current: Record<string, number> = {}
  const gates: Record<string, Promise<void>> = {}
  const refreshCalls: string[] = []
  const dataCalls: Array<{ path: string; auth: string }> = []
  let refreshOutcome: "ok" | "http" | "network" | "sync-throw" | "malformed" = "ok"

  const handle = async (url: string, init: RequestInit): Promise<Response> => {
    const path = url.replace(/^.*\/api\/v1/, "")

    if (path === "/auth/refresh") {
      const { refreshToken } = JSON.parse(init.body as string) as { refreshToken: string }
      refreshCalls.push(refreshToken)
      const [, user, n] = refreshToken.split("-")
      await gates[user]
      if (refreshOutcome === "http") return reply(401, { error: "refresh rejected" })
      if (refreshOutcome === "network") throw new TypeError("fetch failed")
      if (refreshOutcome === "malformed") return reply(200, { data: { accessToken: "only-half" } })
      if (Number(n) !== (current[user] ?? 1)) return reply(401, { error: "token already rotated" })
      const next = Number(n) + 1
      current[user] = next
      return reply(200, { data: { accessToken: `at-${user}-${next}`, refreshToken: `rt-${user}-${next}` } })
    }

    const auth = (init.headers as Record<string, string>).Authorization
    dataCalls.push({ path, auth })
    const [, user, n] = auth.replace("Bearer ", "").split("-")
    // Generation 1 is the expired access token every session starts with.
    return Number(n) > 1 ? reply(200, { data: { owner: user, path } }) : reply(401, { error: "expired" })
  }

  global.fetch = ((url: string, init: RequestInit) => {
    if (refreshOutcome === "sync-throw" && url.endsWith("/auth/refresh")) throw new TypeError("bad request")
    return handle(url, init)
  }) as unknown as typeof fetch

  return {
    refreshCalls,
    dataCalls,
    gate(user: string) {
      const d = deferred()
      gates[user] = d.promise
      return d.resolve
    },
    failRefresh(outcome: typeof refreshOutcome) {
      refreshOutcome = outcome
    },
  }
}

function request(user: string, path = "/me", over: Partial<RequestContext> = {}) {
  const ctx: RequestContext = { refreshCookie: `rt-${user}-1`, written: [], ...over }
  const result = mockRequest.run(ctx, () =>
    apiRequest<{ owner: string; path: string }>(path, { accessToken: `at-${user}-1` }),
  )
  return { ctx, result }
}

describe("apiRequest token refresh on 401", () => {
  const realFetch = global.fetch
  let backend: ReturnType<typeof fakeBackend>

  beforeEach(async () => {
    jest.resetModules()
    ;({ apiRequest } = await import("./client"))
    backend = fakeBackend()
    getRefreshToken.mockImplementation(async () => mockRequest.getStore()?.refreshCookie)
    setAuthTokens.mockImplementation(async (at, rt) => {
      const ctx = mockRequest.getStore()!
      if (ctx.readOnly) throw new Error("Cookies can only be modified in a Server Action or Route Handler")
      ctx.written.push([at, rt])
    })
  })
  afterEach(() => {
    global.fetch = realFetch
    jest.resetAllMocks()
  })

  describe("different sessions", () => {
    it("gives each of two users hitting 401 at the same moment their own data and cookies", async () => {
      const openAlice = backend.gate("alice")
      const alice = request("alice")
      const bob = request("bob")
      await settle()
      openAlice()

      const [a, b] = await Promise.all([alice.result, bob.result])
      expect(a.data.owner).toBe("alice")
      expect(b.data.owner).toBe("bob")
      expect(alice.ctx.written).toEqual([["at-alice-2", "rt-alice-2"]])
      expect(bob.ctx.written).toEqual([["at-bob-2", "rt-bob-2"]])
      expect(backend.refreshCalls.sort()).toEqual(["rt-alice-1", "rt-bob-1"])
    })

    it("does not hold one user up behind another user's slow refresh", async () => {
      const openAlice = backend.gate("alice")
      const alice = request("alice")
      await settle()

      const bobDone = jest.fn()
      const bob = request("bob")
      void bob.result.then((r) => bobDone(r.data.owner))
      await settle()
      expect(bobDone).toHaveBeenCalledWith("bob")

      openAlice()
      await expect(alice.result).resolves.toMatchObject({ data: { owner: "alice" } })
    })

    it("never sends a user's refreshed token on another user's request", async () => {
      const openAlice = backend.gate("alice")
      const openBob = backend.gate("bob")
      const all = [
        request("alice", "/alice/1"),
        request("bob", "/bob/1"),
        request("alice", "/alice/2"),
        request("bob", "/bob/2"),
      ]
      await settle()
      openBob()
      await settle()
      openAlice()
      await Promise.all(all.map((r) => r.result))

      expect(backend.dataCalls).toHaveLength(8)
      for (const { path, auth } of backend.dataCalls) expect(auth).toContain(`-${path.split("/")[1]}-`)
      expect(backend.refreshCalls.sort()).toEqual(["rt-alice-1", "rt-bob-1"])
    })

    it("does not lend a refresh to a request that has no refresh cookie", async () => {
      const openAlice = backend.gate("alice")
      const alice = request("alice")
      await settle()
      const anon = request("anon", "/me", { refreshCookie: undefined })
      const anonOutcome = expect(anon.result).rejects.toMatchObject({ statusCode: 401 })
      await settle()
      openAlice()

      await anonOutcome
      await alice.result
      expect(anon.ctx.written).toEqual([])
    })
  })

  describe("same session", () => {
    it("shares one refresh between concurrent 401s", async () => {
      const open = backend.gate("alice")
      const all = [request("alice", "/1"), request("alice", "/2"), request("alice", "/3")]
      await settle()
      open()

      const results = await Promise.all(all.map((r) => r.result))
      expect(results.map((r) => r.data.owner)).toEqual(["alice", "alice", "alice"])
      expect(backend.refreshCalls).toEqual(["rt-alice-1"])
    })

    it("writes the cookies in every request that can, even if the one that started it cannot", async () => {
      const open = backend.gate("alice")
      const render = request("alice", "/page", { readOnly: true })
      await settle()
      const action = request("alice", "/action")
      await settle()
      open()

      await Promise.all([render.result, action.result])
      expect(backend.refreshCalls).toEqual(["rt-alice-1"])
      expect(render.ctx.written).toEqual([])
      expect(action.ctx.written).toEqual([["at-alice-2", "rt-alice-2"]])
    })
  })

  describe("failed refresh", () => {
    it.each(["http", "network", "malformed", "sync-throw"] as const)(
      "reports the original 401 to every waiter and can be retried afterwards (%s)",
      async (kind) => {
        backend.failRefresh(kind)
        const all = [request("alice", "/1"), request("alice", "/2")]
        const outcomes = await Promise.allSettled(all.map((r) => r.result))
        for (const outcome of outcomes) {
          expect(outcome).toMatchObject({ status: "rejected", reason: { statusCode: 401, message: "expired" } })
        }
        expect(setAuthTokens).not.toHaveBeenCalled()
        // Not replayed with a bogus token.
        expect(backend.dataCalls).toHaveLength(2)

        backend.failRefresh("ok")
        await expect(request("alice").result).resolves.toMatchObject({ data: { owner: "alice" } })
      },
    )

    it("leaves another session's refresh alone", async () => {
      const openAlice = backend.gate("alice")
      const alice = request("alice")
      await settle()
      const stale = request("bob", "/me", { refreshCookie: "rt-bob-99" })
      const staleOutcome = expect(stale.result).rejects.toMatchObject({ statusCode: 401 })
      await settle()

      openAlice()
      await staleOutcome
      await expect(alice.result).resolves.toMatchObject({ data: { owner: "alice" } })
    })

    it("treats an unreadable cookie store as having no session", async () => {
      getRefreshToken.mockRejectedValue(new Error("outside a request scope"))
      await expect(request("alice").result).rejects.toMatchObject({ statusCode: 401 })
      expect(backend.refreshCalls).toEqual([])
    })
  })

  describe("cleanup", () => {
    const inFlightEntries = async (run: () => Promise<unknown>) => {
      const set = jest.spyOn(Map.prototype, "set")
      try {
        await run()
        const maps = set.mock.calls
          .map(([key], i) => ({ key, map: set.mock.contexts[i] as Map<unknown, unknown> }))
          .filter(({ key }) => typeof key === "string" && key.startsWith("rt-"))
          .map(({ map }) => map)
        expect(maps.length).toBeGreaterThan(0)
        return maps.reduce((n, m) => n + m.size, 0)
      } finally {
        set.mockRestore()
      }
    }

    it("keeps no token behind after a success", async () => {
      expect(await inFlightEntries(() => Promise.all([request("alice").result, request("bob").result]))).toBe(0)
    })

    it.each(["http", "network", "malformed", "sync-throw"] as const)(
      "keeps no token behind after a failure (%s)",
      async (kind) => {
        backend.failRefresh(kind)
        expect(await inFlightEntries(() => request("alice").result.catch(() => null))).toBe(0)
      },
    )

    it("refreshes again the next time the same session gets a 401", async () => {
      await request("alice").result
      await expect(request("alice", "/me", { refreshCookie: "rt-alice-2" }).result).resolves.toMatchObject({
        data: { owner: "alice" },
      })
      expect(backend.refreshCalls).toEqual(["rt-alice-1", "rt-alice-2"])
    })
  })

  it("does not log tokens", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      jest.spyOn(console, m).mockImplementation(() => {}),
    )
    await request("alice").result
    backend.failRefresh("network")
    await request("bob").result.catch(() => null)
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    }
  })
})
