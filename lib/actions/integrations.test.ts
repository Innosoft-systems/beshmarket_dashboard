import { createConnectionAction, getConnectionAction, rotateSecretAction } from "./integrations"
import { getAccessToken, getSessionRole } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"

jest.mock("@/lib/auth/session", () => ({ getAccessToken: jest.fn(), getSessionRole: jest.fn() }))
jest.mock("@/lib/api/client", () => {
  class ApiError extends Error {
    constructor(public statusCode: number, message: string) {
      super(message)
    }
  }
  return { apiRequest: jest.fn(), ApiError }
})

const token = getAccessToken as jest.MockedFunction<typeof getAccessToken>
const role = getSessionRole as jest.MockedFunction<typeof getSessionRole>
const request = apiRequest as jest.MockedFunction<typeof apiRequest>

beforeEach(() => {
  jest.clearAllMocks()
  token.mockResolvedValue("t")
})

describe("1C admin server actions: role check (RV-2b D-3)", () => {
  it.each(["restaurant", "kuryer", undefined])("refuses role %p without calling the API", async (r) => {
    role.mockResolvedValue(r)
    await expect(getConnectionAction("rest1")).resolves.toEqual({
      success: false,
      error: "Bu amal uchun ruxsat yo'q",
      status: 403,
    })
    await expect(createConnectionAction("rest1", "json")).resolves.toMatchObject({ success: false, status: 403 })
    await expect(rotateSecretAction("conn1")).resolves.toMatchObject({ success: false, status: 403 })
    expect(request).not.toHaveBeenCalled()
  })

  it("lets an admin through", async () => {
    role.mockResolvedValue("admin")
    request.mockResolvedValue({ data: null, status: 200 })
    await expect(getConnectionAction("rest1")).resolves.toEqual({ success: true, data: null })
    expect(request).toHaveBeenCalledWith("/integrations/1c/connections?restaurant_id=rest1", {
      method: "GET",
      body: undefined,
      accessToken: "t",
    })
  })
})
