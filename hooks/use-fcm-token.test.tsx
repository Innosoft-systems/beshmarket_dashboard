import { renderHook, waitFor } from "@testing-library/react"

const getToken = jest.fn()
jest.mock("firebase/app", () => ({ initializeApp: jest.fn(() => ({})), getApps: () => [] }))
jest.mock("firebase/messaging", () => ({
  getMessaging: jest.fn(() => ({})),
  getToken: (...a: unknown[]) => getToken(...a),
  isSupported: jest.fn(async () => true),
  onMessage: jest.fn(() => () => {}),
}))
jest.mock("sonner", () => ({ toast: { warning: jest.fn() } }))

const ENV = {
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: "vapid",
  NEXT_PUBLIC_FIREBASE_API_KEY: "k",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "d",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "p",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "s",
  NEXT_PUBLIC_FIREBASE_APP_ID: "a",
}

describe("useFcmToken: registration after a click grants permission", () => {
  let mod: typeof import("./use-fcm-token")
  const permission = { value: "default" as NotificationPermission }

  beforeAll(async () => {
    Object.assign(process.env, ENV)
    if (!AbortSignal.timeout) (AbortSignal as unknown as { timeout: () => AbortSignal }).timeout = () => new AbortController().signal
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        get permission() {
          return permission.value
        },
        // On load without a click the browser leaves it undecided.
        requestPermission: jest.fn(async () => permission.value),
      },
    })
    mod = await import("./use-fcm-token")
  })

  it("registers the device once the banner's click grants permission", async () => {
    getToken.mockResolvedValue("fcm-1")
    global.fetch = jest.fn(async () => ({ ok: true })) as unknown as typeof fetch
    renderHook(() => mod.useFcmToken("at1"))
    await new Promise((r) => setTimeout(r, 0))
    expect(getToken).not.toHaveBeenCalled()

    permission.value = "granted"
    window.dispatchEvent(new Event(mod.NOTIFICATION_PERMISSION_EVENT))
    await waitFor(() => expect(getToken).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/notifications/my/device-token"), expect.anything()))
  })

  describe("requestNotificationPermissionFromClick", () => {
    it("asks only while undecided and announces a grant", async () => {
      const req = (window.Notification as unknown as { requestPermission: jest.Mock }).requestPermission
      req.mockClear()
      const fired = jest.fn()
      window.addEventListener(mod.NOTIFICATION_PERMISSION_EVENT, fired)

      permission.value = "granted"
      await expect(mod.requestNotificationPermissionFromClick()).resolves.toBe("granted")
      expect(req).not.toHaveBeenCalled()

      permission.value = "default"
      req.mockImplementationOnce(async () => "granted")
      await expect(mod.requestNotificationPermissionFromClick()).resolves.toBe("granted")
      expect(req).toHaveBeenCalledTimes(1)
      expect(fired).toHaveBeenCalledTimes(1)

      req.mockImplementationOnce(async () => "denied")
      await expect(mod.requestNotificationPermissionFromClick()).resolves.toBe("denied")
      expect(fired).toHaveBeenCalledTimes(1)
      window.removeEventListener(mod.NOTIFICATION_PERMISSION_EVENT, fired)
    })
  })
})
