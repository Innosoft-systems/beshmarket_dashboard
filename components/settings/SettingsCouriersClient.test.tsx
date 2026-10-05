import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { updateSettingAction } from "@/lib/actions/settings"
import { SettingsCouriersClient } from "./SettingsCouriersClient"

const refresh = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

jest.mock("@/lib/actions/settings", () => ({
  updateSettingAction: jest.fn(),
  updateLegalPageAction: jest.fn(),
  getCourierFaqAction: jest.fn(),
  updateCourierFaqAction: jest.fn(),
}))

const mockedUpdate = updateSettingAction as jest.MockedFunction<typeof updateSettingAction>

const renderPage = (settings: { key: string; value: unknown }[] = []) =>
  render(<SettingsCouriersClient settings={settings} legalPages={[]} />)

const commissionInput = () => screen.getByLabelText("Komissiya foizi") as HTMLInputElement

describe("SettingsCouriersClient — kuryer komissiyasi", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedUpdate.mockResolvedValue({ success: true } as Awaited<ReturnType<typeof updateSettingAction>>)
  })

  it("saqlangan foizni va 10 000 so‘mlik misolni ko‘rsatadi", () => {
    renderPage([{ key: "courier_commission_rate", value: 12 }])

    expect(commissionInput().value).toBe("12")
    expect(screen.getByText(/Misol:/).textContent).toMatch(/1[\s ,.]?200 so‘m$/)
  })

  it("sozlama bo‘lmasa 0 dan boshlanadi", () => {
    renderPage()

    expect(commissionInput().value).toBe("0")
  })

  it("kasr foizni son sifatida saqlaydi", async () => {
    const user = userEvent.setup()
    renderPage([{ key: "courier_commission_rate", value: 12 }])

    await user.clear(commissionInput())
    await user.type(commissionInput(), "7.5")
    await user.click(screen.getByRole("button", { name: /Saqlash/ }))

    expect(mockedUpdate).toHaveBeenCalledWith("courier_commission_rate", 7.5)
    expect(toast.success).toHaveBeenCalled()
    expect(refresh).toHaveBeenCalled()
  })

  it.each(["150", "-1", ""])("noto‘g‘ri qiymat (%p) saqlanmaydi", async (value) => {
    const user = userEvent.setup()
    renderPage()

    await user.clear(commissionInput())
    if (value) await user.type(commissionInput(), value)
    await user.click(screen.getByRole("button", { name: /Saqlash/ }))

    expect(toast.error).toHaveBeenCalledWith("Kuryer komissiyasi 0 dan 100 gacha bo‘lishi kerak")
    expect(mockedUpdate).not.toHaveBeenCalled()
  })

  it("backend xatosini ko‘rsatadi", async () => {
    const user = userEvent.setup()
    mockedUpdate.mockResolvedValue({ success: false, error: "Server xatosi" } as Awaited<ReturnType<typeof updateSettingAction>>)
    renderPage()

    await user.click(screen.getByRole("button", { name: /Saqlash/ }))

    expect(toast.error).toHaveBeenCalledWith("Server xatosi")
    expect(toast.success).not.toHaveBeenCalled()
  })
})
