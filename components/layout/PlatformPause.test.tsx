import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import {
  disableMaintenanceAction,
  enableMaintenanceAction,
  extendMaintenanceAction,
  getMaintenanceAction,
} from "@/lib/actions/maintenance"
import type { MaintenanceAdminView } from "@/lib/maintenance"
import { PlatformPauseBanner, PlatformPauseButton, PlatformPauseProvider } from "./PlatformPause"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

jest.mock("@/lib/actions/maintenance", () => ({
  getMaintenanceAction: jest.fn(),
  enableMaintenanceAction: jest.fn(),
  extendMaintenanceAction: jest.fn(),
  disableMaintenanceAction: jest.fn(),
}))

// Capture the socket subscription instead of opening a real socket.
let socketListener: ((payload: unknown) => void) | null = null
jest.mock("@/hooks/use-admin-socket", () => ({
  subscribePlatformMaintenance: (listener: (payload: unknown) => void) => {
    socketListener = listener
    return () => { socketListener = null }
  },
}))

const mocked = {
  get: getMaintenanceAction as jest.MockedFunction<typeof getMaintenanceAction>,
  enable: enableMaintenanceAction as jest.MockedFunction<typeof enableMaintenanceAction>,
  extend: extendMaintenanceAction as jest.MockedFunction<typeof extendMaintenanceAction>,
  disable: disableMaintenanceAction as jest.MockedFunction<typeof disableMaintenanceAction>,
}

const INACTIVE: MaintenanceAdminView = { active: false, reason: null, until: null, message: null, mode: false, history: [] }

function activeView(minutesLeft: number | null, reason: MaintenanceAdminView["reason"] = "friday"): MaintenanceAdminView {
  return {
    active: true,
    reason,
    until: minutesLeft === null ? null : new Date(Date.now() + minutesLeft * 60_000).toISOString(),
    message: { uz: "u", ru: "r", en: "e" },
    mode: true,
    history: [{ action: "enable", at: new Date().toISOString(), by: { id: "u1", role: "admin", name: "aziz" }, reason }],
  }
}

function renderPause(initial: MaintenanceAdminView | null = INACTIVE) {
  return render(
    <PlatformPauseProvider initial={initial}>
      <PlatformPauseButton />
      <PlatformPauseBanner />
    </PlatformPauseProvider>,
  )
}

const banner = () => screen.queryByRole("status")

describe("PlatformPause", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    socketListener = null
    mocked.get.mockResolvedValue({ success: true, data: INACTIVE })
  })

  afterEach(() => jest.useRealTimers())

  it("shows only the quick action while the platform is open", () => {
    renderPause()
    expect(screen.getByRole("button", { name: "Platformani pauzaga qo'yish" })).toBeInTheDocument()
    expect(banner()).toBeNull()
  })

  it("enables a preset pause through the confirm step and shows the red banner", async () => {
    const user = userEvent.setup()
    mocked.enable.mockResolvedValue({ success: true, data: activeView(120, "weather") })
    renderPause()

    await user.click(screen.getByRole("button", { name: "Platformani pauzaga qo'yish" }))
    await user.click(screen.getByRole("button", { name: "Ob-havo" }))
    await user.click(screen.getByRole("button", { name: "+2 soat" }))
    await user.click(screen.getByRole("button", { name: "Davom etish" }))

    expect(screen.getByText("Barcha yangi buyurtmalar to'xtatiladi.")).toBeInTheDocument()
    expect(screen.getByText(/^Ob-havo, 2 soat: soat \d\d:\d\d gacha/)).toBeInTheDocument()
    expect(mocked.enable).not.toHaveBeenCalled() // nothing is sent before the confirm click

    await user.click(screen.getByRole("button", { name: "Pauzani yoqish" }))

    expect(mocked.enable).toHaveBeenCalledWith({ reason: "weather", duration_minutes: 120 })
    const strip = await screen.findByRole("status")
    expect(within(strip).getByText("Platforma pauzada: Ob-havo")).toBeInTheDocument()
    expect(within(strip).getByLabelText("Qolgan vaqt")).toHaveTextContent(/^1:59:5\d$|^2:00:00$/)
    expect(within(strip).getByText("(aziz yoqdi)")).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalled()
  })

  it("sends a custom duration and the optional message", async () => {
    const user = userEvent.setup()
    mocked.enable.mockResolvedValue({ success: true, data: activeView(45, "custom") })
    renderPause()

    await user.click(screen.getByRole("button", { name: "Platformani pauzaga qo'yish" }))
    await user.click(screen.getByRole("button", { name: "Boshqa sabab" }))
    const minutes = screen.getByLabelText("Daqiqa")
    await user.clear(minutes)
    await user.type(minutes, "45")
    await user.type(screen.getByLabelText("Mijozlar uchun xabar (ixtiyoriy)"), "Svet o'chdi")
    await user.click(screen.getByRole("button", { name: "Davom etish" }))
    await user.click(screen.getByRole("button", { name: "Pauzani yoqish" }))

    expect(mocked.enable).toHaveBeenCalledWith({ reason: "custom", duration_minutes: 45, message: { uz: "Svet o'chdi" } })
  })

  it("keeps the form open with an error for invalid custom minutes", async () => {
    const user = userEvent.setup()
    renderPause()

    await user.click(screen.getByRole("button", { name: "Platformani pauzaga qo'yish" }))
    await user.click(screen.getByRole("button", { name: "Boshqa muddat" }))
    const minutes = screen.getByLabelText("Daqiqa")
    await user.clear(minutes)
    await user.type(minutes, "2000")
    await user.click(screen.getByRole("button", { name: "Davom etish" }))

    expect(screen.getByRole("alert")).toHaveTextContent("Muddat 1 dan 1440 daqiqagacha")
    expect(screen.queryByRole("button", { name: "Pauzani yoqish" })).toBeNull()
  })

  it("an indefinite pause has no countdown and no +30 button", async () => {
    const user = userEvent.setup()
    mocked.enable.mockResolvedValue({ success: true, data: activeView(null, "technical") })
    renderPause()

    await user.click(screen.getByRole("button", { name: "Platformani pauzaga qo'yish" }))
    await user.click(screen.getByRole("button", { name: "Muddatsiz" }))
    await user.click(screen.getByRole("button", { name: "Davom etish" }))
    await user.click(screen.getByRole("button", { name: "Pauzani yoqish" }))

    expect(mocked.enable.mock.calls[0][0]).toMatchObject({ indefinite: true })
    const strip = await screen.findByRole("status")
    expect(within(strip).getByText("o'chirilmaguncha")).toBeInTheDocument()
    expect(within(strip).queryByLabelText("Qolgan vaqt")).toBeNull()
    expect(within(strip).queryByRole("button", { name: /30 daqiqa/ })).toBeNull()
  })

  it("shows the backend error and keeps the dialog open when enabling fails", async () => {
    const user = userEvent.setup()
    mocked.enable.mockResolvedValue({ success: false, error: "Pauza muddatini tanlang" })
    renderPause()

    await user.click(screen.getByRole("button", { name: "Platformani pauzaga qo'yish" }))
    await user.click(screen.getByRole("button", { name: "Davom etish" }))
    await user.click(screen.getByRole("button", { name: "Pauzani yoqish" }))

    expect(toast.error).toHaveBeenCalledWith("Pauza muddatini tanlang")
    expect(screen.getByRole("button", { name: "Pauzani yoqish" })).toBeInTheDocument()
    expect(banner()).toBeNull()
  })

  it("extends by 30 minutes from the banner", async () => {
    const user = userEvent.setup()
    mocked.extend.mockResolvedValue({ success: true, data: activeView(60) })
    renderPause(activeView(30))

    await user.click(within(banner()!).getByRole("button", { name: /30 daqiqa/ }))

    expect(mocked.extend).toHaveBeenCalledWith(30)
    await waitFor(() => expect(within(banner()!).getByLabelText("Qolgan vaqt")).toHaveTextContent(/^(59:5\d|1:00:00)$/))
  })

  it("cancels the pause after confirming", async () => {
    const user = userEvent.setup()
    mocked.disable.mockResolvedValue({ success: true, data: INACTIVE })
    renderPause(activeView(30))

    await user.click(within(banner()!).getByRole("button", { name: "Pauzani bekor qilish" }))
    expect(mocked.disable).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Pauzani o'chirish" }))

    expect(mocked.disable).toHaveBeenCalled()
    await waitFor(() => expect(banner()).toBeNull())
    expect(screen.getByRole("button", { name: "Platformani pauzaga qo'yish" })).toBeInTheDocument()
  })

  it("follows another admin's change from the socket and refetches the history", async () => {
    const remote = activeView(60, "friday")
    mocked.get.mockResolvedValue({ success: true, data: remote })
    renderPause()
    expect(banner()).toBeNull()

    const publicState = { active: remote.active, reason: remote.reason, until: remote.until, message: remote.message }
    act(() => socketListener!(publicState))

    expect(within(banner()!).getByText("Platforma pauzada: Juma namozi")).toBeInTheDocument()
    expect(mocked.get).toHaveBeenCalled()
    expect(await within(banner()!).findByText("(aziz yoqdi)")).toBeInTheDocument()
  })

  it("ignores malformed socket payloads", () => {
    renderPause()
    act(() => socketListener!({ nope: true }))
    expect(banner()).toBeNull()
    expect(mocked.get).not.toHaveBeenCalled()
  })

  it("hides the banner by itself when the pause runs out", () => {
    jest.useFakeTimers({ now: new Date("2026-11-13T07:30:00.000Z") })
    renderPause(activeView(1))
    expect(banner()).not.toBeNull()
    expect(within(banner()!).getByLabelText("Qolgan vaqt")).toHaveTextContent("1:00")

    act(() => { jest.advanceTimersByTime(30_000) })
    expect(within(banner()!).getByLabelText("Qolgan vaqt")).toHaveTextContent("0:30")

    act(() => { jest.advanceTimersByTime(30_000) })
    expect(banner()).toBeNull()
    expect(screen.getByRole("button", { name: "Platformani pauzaga qo'yish" })).toBeInTheDocument()
  })
})
