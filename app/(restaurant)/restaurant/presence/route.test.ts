/**
 * @jest-environment node
 */
import { POST } from "./route"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { makeJwt } from "@/lib/auth/test-jwt"

jest.mock("@/lib/auth/session", () => ({ getAccessToken: jest.fn() }))
jest.mock("@/lib/api/client", () => {
  class ApiError extends Error {
    constructor(public statusCode: number, message: string) {
      super(message)
    }
  }
  return { apiRequest: jest.fn(), ApiError }
})

const token = getAccessToken as jest.MockedFunction<typeof getAccessToken>
const api = apiRequest as jest.MockedFunction<typeof apiRequest>
beforeEach(() => jest.clearAllMocks())

describe("/restaurant/presence (F2)", () => {
  it.each([
    ["missing", undefined],
    ["stale", makeJwt({ iatAgo: 1000, expIn: -10 })],
  ])("a %s token gets 401 without calling the backend", async (_l, t) => {
    token.mockResolvedValue(t)
    const res = await POST()
    expect(res.status).toBe(401)
    expect(api).not.toHaveBeenCalled()
  })

  it("a valid token beats", async () => {
    token.mockResolvedValue(makeJwt())
    api.mockResolvedValue({ data: { is_open: true } } as never)
    const res = await POST()
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ is_open: true })
  })
})
