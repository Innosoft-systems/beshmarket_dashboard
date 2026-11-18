import { redirect } from "next/navigation"
import { clearAuthTokens } from "@/lib/auth/session"
import { logoutAction, restaurantLogoutAction } from "./auth"

jest.mock("next/navigation", () => ({ redirect: jest.fn() }))
jest.mock("@/lib/auth/session", () => ({ setAuthTokens: jest.fn(), clearAuthTokens: jest.fn() }))
jest.mock("@/lib/api/auth", () => ({ adminLogin: jest.fn(), restaurantLogin: jest.fn() }))
jest.mock("@/lib/api/client", () => ({ ApiError: class extends Error {} }))

beforeEach(() => jest.clearAllMocks())

describe("logout", () => {
  it("restaurant 'Chiqish' clears the session and goes to the restaurant login", async () => {
    await restaurantLogoutAction()
    expect(clearAuthTokens).toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith("/restaurant/login")
  })

  it("admin logout still goes to the admin login", async () => {
    await logoutAction()
    expect(redirect).toHaveBeenCalledWith("/login")
  })
})
