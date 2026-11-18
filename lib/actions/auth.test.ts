import { redirect } from "next/navigation"
import { clearAuthTokens, getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { logoutAction, restaurantLogoutAction } from "./auth"

jest.mock("next/navigation", () => ({ redirect: jest.fn() }))
jest.mock("@/lib/auth/session", () => ({ setAuthTokens: jest.fn(), clearAuthTokens: jest.fn(), getAccessToken: jest.fn() }))
jest.mock("@/lib/api/auth", () => ({ adminLogin: jest.fn(), restaurantLogin: jest.fn() }))
jest.mock("@/lib/api/client", () => ({ apiRequest: jest.fn(), ApiError: class extends Error {} }))

const token = getAccessToken as jest.MockedFunction<typeof getAccessToken>
const api = apiRequest as jest.MockedFunction<typeof apiRequest>

beforeAll(() => {
  if (!AbortSignal.timeout) (AbortSignal as unknown as { timeout: () => AbortSignal }).timeout = () => new AbortController().signal
})
beforeEach(() => jest.clearAllMocks())

describe("logout", () => {
  it("restaurant 'Chiqish' revokes this device's session, clears cookies, goes to the restaurant login", async () => {
    token.mockResolvedValue("at1")
    api.mockResolvedValue({ data: { message: "ok" } } as never)
    await restaurantLogoutAction()
    expect(api).toHaveBeenCalledWith("/auth/logout", expect.objectContaining({ method: "POST", accessToken: "at1" }))
    expect(clearAuthTokens).toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith("/restaurant/login")
    // Revoke first, then drop the cookies.
    expect(api.mock.invocationCallOrder[0]).toBeLessThan((clearAuthTokens as jest.Mock).mock.invocationCallOrder[0])
  })

  it("a failed or unreachable /auth/logout still logs this device out", async () => {
    token.mockResolvedValue("at1")
    api.mockRejectedValue(new Error("timeout"))
    await restaurantLogoutAction()
    expect(clearAuthTokens).toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith("/restaurant/login")
  })

  it("without an access token it skips the server call", async () => {
    token.mockResolvedValue(undefined)
    await restaurantLogoutAction()
    expect(api).not.toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith("/restaurant/login")
  })

  it("admin logout still goes to the admin login (unchanged, no server call)", async () => {
    await logoutAction()
    expect(api).not.toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith("/login")
  })
})
