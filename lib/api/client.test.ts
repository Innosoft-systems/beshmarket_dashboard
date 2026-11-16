import { apiRequest } from "./client"

jest.mock("@/lib/auth/session", () => ({ getRefreshToken: jest.fn(), setAuthTokens: jest.fn() }))

const ok = () =>
  ({ ok: true, status: 200, json: async () => ({ success: true, data: { ok: 1 } }) }) as unknown as Response

describe("apiRequest network retry (RV-2b D-4)", () => {
  const realFetch = global.fetch
  afterEach(() => {
    global.fetch = realFetch
    jest.useRealTimers()
  })

  it("does not retry a POST after a network error (it may have reached the server)", async () => {
    const fetchMock = jest.fn().mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValue(ok())
    global.fetch = fetchMock as unknown as typeof fetch
    await expect(apiRequest("/integrations/1c/connections", { method: "POST", body: { a: 1 } })).rejects.toThrow(
      "fetch failed",
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each(["GET", "PATCH", "DELETE"] as const)("still retries a %s once", async (method) => {
    const fetchMock = jest.fn().mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValue(ok())
    global.fetch = fetchMock as unknown as typeof fetch
    await expect(apiRequest("/x", { method })).resolves.toEqual({ data: { ok: 1 }, status: 200 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
