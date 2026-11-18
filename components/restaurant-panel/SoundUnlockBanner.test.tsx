import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { SoundUnlockBanner } from "./SoundUnlockBanner"
import { NOTIFICATION_PERMISSION_EVENT } from "@/hooks/use-fcm-token"

let state: "unknown" | "ready" | "blocked" = "unknown"
const listeners = new Set<() => void>()
const unlock = jest.fn()
jest.mock("@/lib/order-alarm", () => ({
  getOrderAlarmSoundState: () => state,
  subscribeOrderAlarmSoundState: (l: () => void) => {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  unlockOrderAlarm: () => unlock(),
}))
jest.mock("@/hooks/use-fcm-token", () => ({ NOTIFICATION_PERMISSION_EVENT: "bm:notification-permission" }))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const setState = (s: typeof state) =>
  act(() => {
    state = s
    listeners.forEach((l) => l())
  })

function mockNotification(permission: NotificationPermission, answer: NotificationPermission = permission) {
  const requestPermission = jest.fn(async () => answer)
  Object.defineProperty(window, "Notification", { value: { permission, requestPermission }, configurable: true })
  return requestPermission
}

beforeEach(() => {
  jest.clearAllMocks()
  state = "unknown"
  listeners.clear()
  unlock.mockResolvedValue(true)
  mockNotification("granted")
})

describe("SoundUnlockBanner", () => {
  it("is hidden until sound is known to be blocked, and hides again once ready", () => {
    render(<SoundUnlockBanner />)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    setState("blocked")
    expect(screen.getByRole("alert")).toHaveTextContent("Yangi buyurtma ovozi o'chiq")
    setState("ready")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("one click unlocks the alarm (permission already granted: no prompt)", async () => {
    const user = userEvent.setup()
    const request = mockNotification("granted")
    state = "blocked"
    render(<SoundUnlockBanner />)
    await user.click(screen.getByRole("button", { name: /Ovozni yoqish/ }))
    expect(unlock).toHaveBeenCalledTimes(1)
    expect(request).not.toHaveBeenCalled()
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Ovoz yoqildi"))
  })

  it("asks for notification permission from the same click and re-runs push registration when granted", async () => {
    const user = userEvent.setup()
    const request = mockNotification("default", "granted")
    const fired = jest.fn()
    window.addEventListener(NOTIFICATION_PERMISSION_EVENT, fired)
    state = "blocked"
    render(<SoundUnlockBanner />)
    await user.click(screen.getByRole("button", { name: /Ovozni yoqish/ }))
    await waitFor(() => expect(fired).toHaveBeenCalledTimes(1))
    expect(request).toHaveBeenCalledTimes(1)
    window.removeEventListener(NOTIFICATION_PERMISSION_EVENT, fired)
  })

  it("explains how to allow notifications when they are denied", async () => {
    mockNotification("denied")
    state = "blocked"
    render(<SoundUnlockBanner />)
    expect(await screen.findByText(/Bildirishnomalar ham o'chirilgan/)).toBeInTheDocument()
  })

  it("says so when the unlock fails", async () => {
    const user = userEvent.setup()
    unlock.mockResolvedValue(false)
    state = "blocked"
    render(<SoundUnlockBanner />)
    await user.click(screen.getByRole("button", { name: /Ovozni yoqish/ }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })
})
