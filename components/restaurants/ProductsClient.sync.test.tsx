import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { updateMyProductAction } from "@/lib/actions/restaurant-panel"
import { updateProductAction } from "@/lib/actions/products"
import { NO_SYNC_FLAGS, type SyncFlags } from "@/lib/product-sync"
import { ProductsClient } from "./ProductsClient"

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }))
jest.mock("@/lib/actions/products", () => ({
  deleteProductAction: jest.fn(),
  updateProductAction: jest.fn(),
  createMenuCategoryAction: jest.fn(),
  deleteMenuCategoryAction: jest.fn(),
  loadProductsPageAction: jest.fn(async () => ({ success: true, data: { data: [], pagination: { page: 1, totalPages: 1, total: 0 } } })),
  loadProductCountsAction: jest.fn(async () => ({ success: true, data: { total: 0, uncategorized: 0, by_category: {} } })),
  createProductAction: jest.fn(),
  unlockProductSyncFieldsAction: jest.fn(),
}))
jest.mock("@/lib/actions/restaurant-panel", () => ({
  createMyMenuCategoryAction: jest.fn(),
  deleteMyMenuCategoryAction: jest.fn(),
  deleteMyProductAction: jest.fn(),
  updateMyProductAction: jest.fn(),
  createMyProductAction: jest.fn(),
  unlockMyProductSyncFieldsAction: jest.fn(),
}))
// The list paging hook needs IntersectionObserver; render the initial page as-is.
jest.mock("@/hooks/use-infinite-list", () => ({
  useInfiniteList: ({ initial }: { initial: { items: unknown[] } }) => ({
    items: initial.items,
    hasMore: false,
    loading: false,
    error: null,
    sentinelRef: () => {},
    loadMore: jest.fn(),
    reset: jest.fn(),
  }),
}))

const updateMy = updateMyProductAction as jest.MockedFunction<typeof updateMyProductAction>
const updateAdmin = updateProductAction as jest.MockedFunction<typeof updateProductAction>

const HAND_MADE = {
  _id: "p-hand",
  name_uz: "Lavash",
  name_ru: "Лаваш",
  menu_category_id: "c1",
  price: 30000,
  images: [],
  is_active: true,
  is_available: true,
  order_count: 3,
}

const SYNCED = {
  _id: "p-1c",
  name_uz: "Chexol iPhone 15",
  name_ru: "Чехол iPhone 15",
  menu_category_id: "c1",
  price: 120000,
  images: [],
  is_active: false,
  is_available: true,
  order_count: 0,
  stock: 7,
  sync: { source: "1c", locked_fields: [], hidden_by_sync: "no_price" },
}

const MANAGED: SyncFlags = { connected: true, price_managed: true, stock_managed: true, content_managed: true }

function renderList(scope: "admin" | "restaurant", flags: SyncFlags = MANAGED, items: unknown[] = [HAND_MADE, SYNCED]) {
  return render(
    <ProductsClient
      restaurant={{ _id: "r1", name: "Semya" }}
      initial={{ data: items as never, pagination: { page: 1, totalPages: 1, total: items.length } }}
      counts={{ total: items.length, uncategorized: 0, by_category: { c1: items.length } }}
      categories={[{ _id: "c1", name_uz: "Aksessuarlar" }]}
      scope={scope}
      syncFlags={flags}
    />,
  )
}

const row = (name: string) => screen.getByText(name).closest("tr")!

beforeEach(() => jest.clearAllMocks())

describe("ProductsClient: 1C products (A4)", () => {
  it.each(["admin", "restaurant"] as const)("%s: hand-made rows look exactly as before", (scope) => {
    renderList(scope)
    const r = row("Lavash")
    expect(within(r).queryByText("1C")).not.toBeInTheDocument()
    expect(within(r).getByRole("button", { name: "O'chirish" })).toBeInTheDocument()
    expect(within(r).queryByRole("button", { name: /Yashirish/ })).not.toBeInTheDocument()
    expect(within(r).queryByText("1C dan boshqariladi")).not.toBeInTheDocument()
    expect(within(r).queryByText(/Qoldiq:/)).not.toBeInTheDocument()
  })

  it.each(["admin", "restaurant"] as const)("%s: synced rows get the 1C badge, no delete, the hide reason", (scope) => {
    renderList(scope)
    const r = row("Chexol iPhone 15")
    expect(within(r).getByText("1C")).toBeInTheDocument()
    expect(within(r).queryByRole("button", { name: "O'chirish" })).not.toBeInTheDocument()
    expect(within(r).getByRole("button", { name: /Yashirish/ })).toBeInTheDocument()
    expect(within(r).getByText("Narx yo'q")).toBeInTheDocument()
    expect(within(r).getByText("1C dan boshqariladi")).toBeInTheDocument()
    expect(within(r).getByText("Qoldiq: 7")).toBeInTheDocument()
  })

  it("price / stock hints follow the flags", () => {
    renderList("admin", NO_SYNC_FLAGS)
    const r = row("Chexol iPhone 15")
    expect(within(r).getByText("1C")).toBeInTheDocument()
    expect(within(r).queryByText("1C dan boshqariladi")).not.toBeInTheDocument()
    expect(within(r).queryByText(/Qoldiq:/)).not.toBeInTheDocument()
  })

  it("'Yashirish' hides an active synced product via is_active:false", async () => {
    const user = userEvent.setup()
    updateMy.mockResolvedValue({ success: true, data: undefined })
    renderList("restaurant", MANAGED, [{ ...SYNCED, is_active: true, sync: { source: "1c" } }])
    await user.click(within(row("Chexol iPhone 15")).getByRole("button", { name: /Yashirish/ }))
    expect(updateMy).toHaveBeenCalledWith("p-1c", { is_active: false })
  })

  it("panel 'show' of a sync-hidden product explains that it stays hidden", async () => {
    const user = userEvent.setup()
    updateMy.mockResolvedValue({ success: true, data: undefined })
    renderList("restaurant")
    // The power button is the second action button in the row.
    const buttons = within(row("Chexol iPhone 15")).getAllByRole("button")
    await user.click(buttons[buttons.findIndex((b) => b.querySelector(".lucide-power"))])
    expect(updateMy).toHaveBeenCalledWith("p-1c", { is_active: true })
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith(expect.stringMatching(/yashirin qoladi: Narx yo'q/)))
  })

  it("the backend's 400/409 text is shown as is", async () => {
    const user = userEvent.setup()
    updateAdmin.mockResolvedValue({ success: false, error: "Bu maydon 1C dan boshqariladi: narx/qoldiqni 1C da o'zgartiring" })
    renderList("admin")
    const buttons = within(row("Chexol iPhone 15")).getAllByRole("button")
    await user.click(buttons[buttons.findIndex((b) => b.querySelector(".lucide-power"))])
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Bu maydon 1C dan boshqariladi: narx/qoldiqni 1C da o'zgartiring"),
    )
  })
})
