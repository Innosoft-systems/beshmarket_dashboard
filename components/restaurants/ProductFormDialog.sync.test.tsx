import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { unlockProductSyncFieldsAction, updateProductAction } from "@/lib/actions/products"
import { unlockMyProductSyncFieldsAction, updateMyProductAction } from "@/lib/actions/restaurant-panel"
import { NO_SYNC_FLAGS, type SyncFlags } from "@/lib/product-sync"
import { ProductFormDialog } from "./ProductFormDialog"

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }))
jest.mock("@/lib/actions/products", () => ({
  createProductAction: jest.fn(),
  updateProductAction: jest.fn(),
  unlockProductSyncFieldsAction: jest.fn(),
}))
jest.mock("@/lib/actions/restaurant-panel", () => ({
  createMyProductAction: jest.fn(),
  updateMyProductAction: jest.fn(),
  unlockMyProductSyncFieldsAction: jest.fn(),
}))

const updateAdmin = updateProductAction as jest.MockedFunction<typeof updateProductAction>
const updateMy = updateMyProductAction as jest.MockedFunction<typeof updateMyProductAction>
const unlockAdmin = unlockProductSyncFieldsAction as jest.MockedFunction<typeof unlockProductSyncFieldsAction>
const unlockMy = unlockMyProductSyncFieldsAction as jest.MockedFunction<typeof unlockMyProductSyncFieldsAction>

const CATEGORIES = [{ _id: "c1", name_uz: "Aksessuarlar" }]

const HAND_MADE = {
  _id: "p-hand",
  name_uz: "Lavash",
  name_ru: "Лаваш",
  name_en: "Lavash",
  menu_category_id: "c1",
  price: 30000,
  images: [],
  is_active: true,
  is_available: true,
}

const SYNCED = {
  _id: "p-1c",
  name_uz: "Чехол iPhone 15",
  name_ru: "Чехол iPhone 15",
  name_en: "Чехол iPhone 15",
  slug: "chekhol-iphone-15-a1b2c3",
  menu_category_id: "c1",
  price: 120000,
  images: [],
  is_active: true,
  is_available: true,
  stock: 4,
  sync: { source: "1c", locked_fields: ["name_uz", "images"], hidden_by_sync: null },
}

const MANAGED: SyncFlags = { connected: true, price_managed: true, stock_managed: true, content_managed: true }

function renderForm(product: unknown, scope: "admin" | "restaurant" = "admin", flags: SyncFlags = MANAGED) {
  const onSaved = jest.fn()
  const onClose = jest.fn()
  render(
    <ProductFormDialog
      product={product}
      restaurantId="r1"
      categories={CATEGORIES}
      scope={scope}
      syncFlags={flags}
      onSaved={onSaved}
      onClose={onClose}
    />,
  )
  return { onSaved, onClose }
}

beforeEach(() => jest.clearAllMocks())

describe("ProductFormDialog: hand-made products are unchanged", () => {
  it("no 1C note, price editable, no lock controls, slug is sent", async () => {
    const user = userEvent.setup()
    updateAdmin.mockResolvedValue({ success: true })
    renderForm(HAND_MADE, "admin", MANAGED)

    expect(screen.queryByText("Bu mahsulot 1C dan keladi")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /1C dan olish/ })).not.toBeInTheDocument()
    const price = screen.getByLabelText("Narx (so'm) *")
    expect(price).not.toHaveAttribute("readonly")

    await user.click(screen.getByRole("button", { name: "Saqlash" }))
    expect(updateAdmin).toHaveBeenCalledWith("p-hand", expect.objectContaining({ slug: "lavash", price: 30000 }))
  })
})

describe("ProductFormDialog: 1C products (A4)", () => {
  it("shows the 1C note, read-only price and the 1C stock while managed", () => {
    renderForm(SYNCED)
    expect(screen.getByRole("note")).toHaveTextContent("Bu mahsulot 1C dan keladi")
    expect(screen.getByLabelText("Narx (so'm) *")).toHaveAttribute("readonly")
    expect(screen.getByLabelText("Aksiya narxi")).toHaveAttribute("readonly")
    expect(screen.getByText(/1C dan boshqariladi: narxni 1C da o'zgartiring/)).toBeInTheDocument()
    expect(screen.getByText(/Qoldiq \(1C\):/)).toHaveTextContent("4")
  })

  it("price stays editable when 1C does not manage prices", () => {
    renderForm(SYNCED, "admin", { ...NO_SYNC_FLAGS, connected: true })
    expect(screen.getByLabelText("Narx (so'm) *")).not.toHaveAttribute("readonly")
  })

  it("1C stock: shown when tracked (any flags), hidden when untracked and not managed", () => {
    const { unmount } = render(
      <ProductFormDialog product={SYNCED} restaurantId="r1" categories={CATEGORIES} syncFlags={NO_SYNC_FLAGS} onClose={jest.fn()} />,
    )
    // B6 enforces any numeric stock in orders, so it is shown even when offers are not live.
    expect(screen.getByText(/Qoldiq \(1C\):/)).toHaveTextContent("4")
    unmount()
    render(
      <ProductFormDialog
        product={{ ...SYNCED, stock: null }}
        restaurantId="r1"
        categories={CATEGORIES}
        syncFlags={NO_SYNC_FLAGS}
        onClose={jest.fn()}
      />,
    )
    expect(screen.queryByText(/Qoldiq \(1C\):/)).not.toBeInTheDocument()
  })

  it("lock controls appear only on locked fields", () => {
    renderForm(SYNCED)
    expect(screen.getByRole("button", { name: "Nomi (UZ): 1C dan olish" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Rasmlar: 1C dan olish" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Nomi (RU): 1C dan olish" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Kategoriya: 1C dan olish" })).not.toBeInTheDocument()
  })

  it.each([
    ["admin", unlockAdmin],
    ["restaurant", unlockMy],
  ] as const)("%s: '1C dan olish' asks first, then unlocks that one field", async (scope, unlock) => {
    const user = userEvent.setup()
    unlock.mockResolvedValue({ success: true, data: { sync: { locked_fields: ["images"] } } } as never)
    const { onSaved } = renderForm(SYNCED, scope)

    await user.click(screen.getByRole("button", { name: "Nomi (UZ): 1C dan olish" }))
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent('"Nomi (UZ)" yana 1C ga qaytariladi')
    expect(unlock).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole("button", { name: "1C ga qaytarish" }))
    expect(unlock).toHaveBeenCalledWith("p-1c", ["name_uz"])
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Nomi (UZ): 1C dan olish" })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole("button", { name: "Rasmlar: 1C dan olish" })).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('"Nomi (UZ)" 1C ga qaytarildi')
    expect(onSaved).toHaveBeenCalled()
  })

  it("a failed unlock shows the server text and keeps the lock", async () => {
    const user = userEvent.setup()
    unlockAdmin.mockResolvedValue({ success: false, error: "Bu mahsulot 1C bilan sinxronlanmaydi" })
    renderForm(SYNCED)
    await user.click(screen.getByRole("button", { name: "Nomi (UZ): 1C dan olish" }))
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "1C ga qaytarish" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Bu mahsulot 1C bilan sinxronlanmaydi"))
    expect(screen.getByRole("button", { name: "Nomi (UZ): 1C dan olish" })).toBeInTheDocument()
  })

  it("saving does not send a rebuilt slug (the sync's slug is kept)", async () => {
    const user = userEvent.setup()
    updateMy.mockResolvedValue({ success: true, data: undefined })
    renderForm(SYNCED, "restaurant")
    await user.click(screen.getByRole("button", { name: "Saqlash" }))
    const body = updateMy.mock.calls[0][1]
    // undefined is dropped when the body is serialised, so no slug reaches the API.
    expect(body.slug).toBeUndefined()
    expect(JSON.parse(JSON.stringify(body))).not.toHaveProperty("slug")
  })

  it("never sends price fields while 1C manages prices (RV-2b R2-2)", async () => {
    const user = userEvent.setup()
    updateAdmin.mockResolvedValue({ success: true })
    // A product hidden as no_price has no price: the form must not send 0.
    renderForm({ ...SYNCED, price: undefined, sync: { ...SYNCED.sync, hidden_by_sync: "no_price" } })
    await user.click(screen.getByRole("button", { name: "Saqlash" }))
    const body = updateAdmin.mock.calls[0][1]
    expect(body).not.toHaveProperty("price")
    expect(body).not.toHaveProperty("discount_price")
  })

  it("price is still sent for a 1C product when 1C does not manage prices", async () => {
    const user = userEvent.setup()
    updateAdmin.mockResolvedValue({ success: true })
    renderForm(SYNCED, "admin", NO_SYNC_FLAGS)
    await user.click(screen.getByRole("button", { name: "Saqlash" }))
    expect(updateAdmin.mock.calls[0][1].price).toBe(120000)
  })

  it("sends names / descriptions only when edited (RV-2b R2-1)", async () => {
    const user = userEvent.setup()
    updateAdmin.mockResolvedValue({ success: true })
    // No description_* keys at all, like a 1C product created without a description.
    renderForm(SYNCED)
    const inputs = screen.getAllByDisplayValue("Чехол iPhone 15")
    await user.clear(inputs[1])
    await user.type(inputs[1], "Чехол для iPhone 15")
    await user.click(screen.getByRole("button", { name: "Saqlash" }))
    const body = updateAdmin.mock.calls[0][1]
    expect(body.name_ru).toBe("Чехол для iPhone 15")
    for (const f of ["name_uz", "name_en", "description_uz", "description_ru", "description_en"]) {
      expect(body).not.toHaveProperty(f)
    }
  })

  it("hand-made products still send every field", async () => {
    const user = userEvent.setup()
    updateAdmin.mockResolvedValue({ success: true })
    renderForm(HAND_MADE)
    await user.click(screen.getByRole("button", { name: "Saqlash" }))
    expect(updateAdmin.mock.calls[0][1]).toEqual(
      expect.objectContaining({ name_uz: "Lavash", description_uz: "", price: 30000 }),
    )
  })

  it("the backend's 400 text on save is shown via toast", async () => {
    const user = userEvent.setup()
    updateAdmin.mockResolvedValue({
      success: false,
      error: "Bu maydon 1C dan boshqariladi: narx/qoldiqni 1C da o'zgartiring",
    })
    const { onClose } = renderForm(SYNCED, "admin", NO_SYNC_FLAGS)
    await user.click(screen.getByRole("button", { name: "Saqlash" }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Bu maydon 1C dan boshqariladi: narx/qoldiqni 1C da o'zgartiring"),
    )
    expect(onClose).not.toHaveBeenCalled()
  })
})
