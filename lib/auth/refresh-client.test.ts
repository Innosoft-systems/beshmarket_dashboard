import { __resetRefreshClientForTests, refreshAccessToken } from "./refresh-client"

const fetchMock = jest.fn()
const json = (status: number, body: unknown = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})
const bodies = () => fetchMock.mock.calls.map((c) => JSON.parse(c[1].body))

beforeEach(() => {
  __resetRefreshClientForTests()
  fetchMock.mockReset()
  global.fetch = fetchMock as unknown as typeof fetch
  Object.defineProperty(navigator, "locks", { value: undefined, configurable: true })
})
afterEach(() => jest.useRealTimers())

describe("refreshAccessToken", () => {
  it("resolves the new token; concurrent callers in a tab share one request", async () => {
    fetchMock.mockResolvedValue(json(200, { accessToken: "at2" }))
    const [a, b, c] = await Promise.all([refreshAccessToken(), refreshAccessToken(), refreshAccessToken()])
    expect([a, b, c]).toEqual(["at2", "at2", "at2"])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("null only on a definite 401 (logged out)", async () => {
    fetchMock.mockResolvedValue(json(401))
    await expect(refreshAccessToken()).resolves.toBeNull()
  })

  it("server unavailable (503, network error) is retried with backoff and the session kept (F1)", async () => {
    jest.useFakeTimers()
    fetchMock
      .mockResolvedValueOnce(json(503))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(json(200, { accessToken: "at2" }))
    const p = refreshAccessToken()
    await jest.advanceTimersByTimeAsync(1_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await jest.advanceTimersByTimeAsync(2_000)
    await expect(p).resolves.toBe("at2")
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("runs inside the cross-tab Web Lock when the browser has one (F3)", async () => {
    const request = jest.fn((_name: string, cb: () => Promise<unknown>) => cb())
    Object.defineProperty(navigator, "locks", { value: { request }, configurable: true })
    fetchMock.mockResolvedValue(json(200, { accessToken: "at2" }))
    await expect(refreshAccessToken()).resolves.toBe("at2")
    expect(request).toHaveBeenCalledWith("bm-auth-refresh", expect.any(Function))
  })

  it("takes a token another tab just got; asks again with force only if it already had that token", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { accessToken: "atX", reused: true }))
    await expect(refreshAccessToken()).resolves.toBe("atX")
    expect(bodies()).toEqual([{ force: false }])

    // The same token comes back while this tab is asking to replace it: force a real refresh.
    fetchMock
      .mockResolvedValueOnce(json(200, { accessToken: "atX", reused: true }))
      .mockResolvedValueOnce(json(200, { accessToken: "atY" }))
    await expect(refreshAccessToken()).resolves.toBe("atY")
    expect(bodies()).toEqual([{ force: false }, { force: false }, { force: true }])
  })
})
