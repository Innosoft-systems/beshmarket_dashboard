import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { updateConnectionAction } from "@/lib/actions/integrations"
import { ConnectionSettingsForm } from "./ConnectionSettingsForm"
import { installPointerEventPolyfill, makeConnection } from "./fixtures"

installPointerEventPolyfill()
import type { IntegrationConnection } from "@/types/integration"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }))
jest.mock("@/lib/actions/integrations", () => ({ updateConnectionAction: jest.fn() }))

const update = updateConnectionAction as jest.MockedFunction<typeof updateConnectionAction>

function renderForm(connection: IntegrationConnection = makeConnection()) {
  const onSaved = jest.fn()
  render(<ConnectionSettingsForm connection={connection} onSaved={onSaved} />)
  return { onSaved }
}

const save = () => screen.getByRole("button", { name: /Saqlash/ })

beforeEach(() => jest.clearAllMocks())

describe("ConnectionSettingsForm", () => {
  it("save is disabled until something changes", () => {
    renderForm()
    expect(save()).toBeDisabled()
  })

  it("sends only the changed fields and reports the saved connection", async () => {
    const user = userEvent.setup()
    const saved = makeConnection({ stock_buffer: 3, warehouse_ids: ["wh-2"] })
    update.mockResolvedValue({ success: true, data: saved })
    const { onSaved } = renderForm()

    const buffer = screen.getByLabelText("Qoldiq zaxirasi (dona)")
    await user.clear(buffer)
    await user.type(buffer, "3")
    await user.click(screen.getByRole("checkbox", { name: "Магазин" }))
    await user.click(save())

    expect(update).toHaveBeenCalledWith("conn1", { stock_buffer: 3, warehouse_ids: ["wh-2"] })
    expect(onSaved).toHaveBeenCalledWith(saved)
    expect(toast.success).toHaveBeenCalledWith("Sozlamalar saqlandi")
  })

  it("an invalid number blocks the save with a message", async () => {
    const user = userEvent.setup()
    renderForm()
    const pct = screen.getByLabelText("Yashirish chegarasi (%)")
    await user.clear(pct)
    await user.type(pct, "2")
    await user.click(save())

    expect(await screen.findByText("Chegara 5% dan 100% gacha bo'lishi kerak")).toBeInTheDocument()
    expect(update).not.toHaveBeenCalled()
  })

  it("the switch for new products round-trips as a boolean", async () => {
    const user = userEvent.setup()
    update.mockResolvedValue({ success: true, data: makeConnection({ new_products_visible: false }) })
    renderForm()
    await user.click(screen.getByRole("switch"))
    await user.click(save())
    expect(update).toHaveBeenCalledWith("conn1", { new_products_visible: false })
  })

  it("server errors are shown and the form keeps its values", async () => {
    const user = userEvent.setup()
    update.mockResolvedValue({ success: false, error: "stock_buffer must not be greater than 1000", status: 400 })
    renderForm()
    const buffer = screen.getByLabelText("Qoldiq zaxirasi (dona)")
    await user.clear(buffer)
    await user.type(buffer, "7")
    await user.click(save())

    expect(toast.error).toHaveBeenCalledWith("stock_buffer must not be greater than 1000")
    expect(buffer).toHaveValue("7")
  })

  it("offers 'Jonli' without a retail price type is stopped client-side", async () => {
    const user = userEvent.setup()
    // Stored as live without a price type (e.g. changed elsewhere); saving anything re-validates.
    renderForm(makeConnection({ offers_mode: "live", retail_price_type_id: null }))
    await user.click(screen.getByRole("switch"))
    await user.click(save())
    expect(await screen.findByText("Jonli rejim uchun avval chakana narx turini tanlang")).toBeInTheDocument()
    expect(update).not.toHaveBeenCalled()
  })

  describe("IP list", () => {
    it("rejects a bad address, adds a good one, removes one, and saves the list", async () => {
      const user = userEvent.setup()
      update.mockResolvedValue({ success: true, data: makeConnection({ allowed_ips: ["198.51.100.7"] }) })
      renderForm()
      const input = screen.getByLabelText("Yangi IP manzil")

      await user.type(input, "999.1.1.1{Enter}")
      expect(screen.getByText("Noto'g'ri IP manzil (masalan 203.0.113.10 yoki 203.0.113.0/24)")).toBeInTheDocument()

      await user.clear(input)
      await user.type(input, "198.51.100.0/24")
      await user.click(screen.getByRole("button", { name: /Qo'shish/ }))
      expect(screen.getByText("198.51.100.0/24")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "203.0.113.10 ni o'chirish" }))
      await user.click(save())
      expect(update).toHaveBeenCalledWith("conn1", { allowed_ips: ["198.51.100.0/24"] })
    })

    it("refuses duplicates and warns when the list is empty", async () => {
      const user = userEvent.setup()
      renderForm(makeConnection({ allowed_ips: [] }))
      expect(screen.getByText(/istalgan IP dan ulanish mumkin/)).toBeInTheDocument()
      const input = screen.getByLabelText("Yangi IP manzil")
      await user.type(input, "10.0.0.1{Enter}")
      await user.type(input, "10.0.0.1{Enter}")
      expect(screen.getByText("Bu IP allaqachon ro'yxatda")).toBeInTheDocument()
    })
  })

  it("backend 400 on offers 'Jonli' shows its reason and disables 'Jonli'", async () => {
    const user = userEvent.setup()
    const reason = "Narx va qoldiqni jonli rejimga hali o'tkazib bo'lmaydi: buyurtmalarda qoldiq nazorati hali yoqilmagan"
    update.mockResolvedValue({ success: false, error: reason, status: 400 })
    renderForm(makeConnection({ retail_price_type_id: "pt-retail" }))

    await user.click(screen.getByRole("combobox", { name: "Narx va qoldiq" }))
    await user.click(await screen.findByRole("option", { name: "Jonli" }))
    await user.click(save())

    expect(update).toHaveBeenCalledWith("conn1", { offers_mode: "live" })
    expect(toast.error).toHaveBeenCalledWith(reason)
    expect(await screen.findByRole("note")).toHaveTextContent(reason)
  })

  it("backend 400 on catalog 'Jonli' (until B5) disables catalog 'Jonli' only", async () => {
    const user = userEvent.setup()
    const reason =
      "Katalogni jonli rejimga hali o'tkazib bo'lmaydi: panelda qo'lda tahrirlangan nomlarni himoyalash hali yoqilmagan"
    update.mockResolvedValue({ success: false, error: reason, status: 400 })
    renderForm()

    await user.click(screen.getByRole("combobox", { name: "Katalog (mahsulotlar)" }))
    await user.click(await screen.findByRole("option", { name: "Jonli" }))
    await user.click(save())

    expect(update).toHaveBeenCalledWith("conn1", { catalog_mode: "live" })
    const notes = await screen.findAllByRole("note")
    expect(notes).toHaveLength(1)
    expect(notes[0]).toHaveTextContent(reason)

    // The catalog mode goes back to its saved value, and its "Jonli" is disabled.
    expect(screen.getByRole("combobox", { name: "Katalog (mahsulotlar)" })).toHaveTextContent("Sinov")
    await user.click(screen.getByRole("combobox", { name: "Katalog (mahsulotlar)" }))
    expect(await screen.findByRole("option", { name: "Jonli" })).toHaveAttribute("aria-disabled", "true")
  })

  it("schedule: daily full time and heartbeat window are saved (rev 2 / rev 3)", async () => {
    update.mockResolvedValue({
      success: true,
      data: makeConnection({ daily_full_at: "02:30", heartbeat_window: { from: "09:00", to: "22:00" } }),
    })
    renderForm()
    expect(screen.getByLabelText("Har kunlik to'liq katalog vaqti")).toHaveValue("03:00")
    expect(screen.getByText(/Soat 06:00 gacha kelmasa/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Har kunlik to'liq katalog vaqti"), { target: { value: "02:30" } })
    fireEvent.change(screen.getByLabelText("Aloqa nazorati: boshlanishi"), { target: { value: "09:00" } })
    expect(await screen.findByText(/Soat 05:30 gacha kelmasa/)).toBeInTheDocument()
    await userEvent.setup().click(save())

    expect(update).toHaveBeenCalledWith("conn1", {
      daily_full_at: "02:30",
      heartbeat_window: { from: "09:00", to: "22:00" },
    })
  })

  it("schedule: equal heartbeat ends are refused before saving", async () => {
    renderForm()
    fireEvent.change(screen.getByLabelText("Aloqa nazorati: tugashi"), { target: { value: "08:00" } })
    await userEvent.setup().click(save())
    expect(await screen.findByText("Boshlanish va tugash vaqti bir xil bo'lmasin")).toBeInTheDocument()
    expect(update).not.toHaveBeenCalled()
  })

  it("an unrelated 400 does not disable 'Jonli' (RV-2b D-1)", async () => {
    const user = userEvent.setup()
    update.mockResolvedValue({ success: false, error: "allowed_ips: har bir qiymat IP manzil yoki CIDR bo'lishi kerak", status: 400 })
    renderForm()
    await user.click(screen.getByRole("combobox", { name: "Katalog (mahsulotlar)" }))
    await user.click(await screen.findByRole("option", { name: "Jonli" }))
    await user.click(save())
    expect(toast.error).toHaveBeenCalled()
    expect(screen.queryByRole("note")).not.toBeInTheDocument()
    // The choice is kept, not reverted.
    expect(screen.getByRole("combobox", { name: "Katalog (mahsulotlar)" })).toHaveTextContent("Jonli")
  })

  describe("refreshed connection while the form is open (RV-2b D-2)", () => {
    it("with unsaved edits: only the edited field is sent, another admin's change is not reverted", async () => {
      const user = userEvent.setup()
      update.mockResolvedValue({ success: true, data: makeConnection({ stock_buffer: 5, max_deactivate_ratio: 0.3 }) })
      const onSaved = jest.fn()
      const { rerender } = render(<ConnectionSettingsForm connection={makeConnection()} onSaved={onSaved} />)

      const buffer = screen.getByLabelText("Qoldiq zaxirasi (dona)")
      await user.clear(buffer)
      await user.type(buffer, "5")
      // Another admin changed the threshold; "Yangilash" brings the fresh connection in.
      rerender(<ConnectionSettingsForm connection={makeConnection({ max_deactivate_ratio: 0.3 })} onSaved={onSaved} />)
      await user.click(save())

      expect(update).toHaveBeenCalledWith("conn1", { stock_buffer: 5 })
    })

    it("without edits: the form shows the fresh values", async () => {
      const { rerender } = render(<ConnectionSettingsForm connection={makeConnection()} onSaved={jest.fn()} />)
      expect(screen.getByLabelText("Yashirish chegarasi (%)")).toHaveValue("50")
      rerender(<ConnectionSettingsForm connection={makeConnection({ max_deactivate_ratio: 0.3 })} onSaved={jest.fn()} />)
      await waitFor(() => expect(screen.getByLabelText("Yashirish chegarasi (%)")).toHaveValue("30"))
      expect(save()).toBeDisabled()
    })
  })

  it("warehouses: no mapped warehouse means no stock; warns when offers are live (B4)", () => {
    renderForm(makeConnection({ warehouse_ids: [] }))
    expect(screen.getByText(/Hech biri tanlanmasa, qoldiq qo'llanmaydi/)).toBeInTheDocument()
    expect(screen.queryByText(/ombor tanlanmagan: 1C qoldig'i mahsulotlarga yozilmaydi/)).not.toBeInTheDocument()
    cleanup()
    renderForm(makeConnection({ offers_mode: "live", retail_price_type_id: "pt-retail", warehouse_ids: [] }))
    expect(screen.getByText(/ombor tanlanmagan: 1C qoldig'i mahsulotlarga yozilmaydi/)).toBeInTheDocument()
  })

  it("offers 'Jonli' with a retail price type is sent and saved (B6 allows it)", async () => {
    const user = userEvent.setup()
    update.mockResolvedValue({ success: true, data: makeConnection({ offers_mode: "live", retail_price_type_id: "pt-retail" }) })
    renderForm(makeConnection({ retail_price_type_id: "pt-retail", warehouse_ids: ["wh-1"] }))
    await user.click(screen.getByRole("combobox", { name: "Narx va qoldiq" }))
    await user.click(await screen.findByRole("option", { name: "Jonli" }))
    await user.click(save())
    expect(update).toHaveBeenCalledWith("conn1", { offers_mode: "live" })
    expect(toast.success).toHaveBeenCalledWith("Sozlamalar saqlandi")
    expect(screen.queryByRole("note")).not.toBeInTheDocument()
  })

  it("empty state when 1C has not reported price types or warehouses", () => {
    renderForm(makeConnection({ seen_price_types: [], seen_warehouses: [] }))
    expect(screen.getAllByText("1C hali ma'lumot yubormagan").length).toBeGreaterThanOrEqual(3)
  })

  it("a configured id that 1C no longer reports stays visible", () => {
    renderForm(makeConnection({ warehouse_ids: ["wh-gone"] }))
    expect(screen.getByRole("checkbox", { name: "wh-gone (1C hozir yubormayapti)" })).toBeChecked()
  })
})
