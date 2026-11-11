import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CourierDetailClient, type CourierOrdersFilters } from "./CourierDetailClient"

/**
 * Courier order history (R6): rendering, the orders_* URL contract written by
 * navigateOrders (page reset rule, default status kept out of the URL), the
 * pager with page jump, and the back-link on each row.
 */

const replace = jest.fn()
const push = jest.fn()
const refresh = jest.fn()
let mockQuery = ""

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push, refresh }),
  usePathname: () => "/couriers/c1",
  useSearchParams: () => new URLSearchParams(mockQuery),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/lib/actions/couriers", () => ({
  updateCourierAction: jest.fn(),
  blockCourierUserAction: jest.fn(),
  deleteCourierAction: jest.fn(),
  correctionCourierAction: jest.fn(),
  updateDocumentStatusAction: jest.fn(),
  upsertCourierDocumentsAdminAction: jest.fn(),
}))
jest.mock("@/lib/actions/shifts", () => ({ forceStartCourierAction: jest.fn() }))
jest.mock("recharts", () => {
  const Null = () => null
  return {
    ResponsiveContainer: Null, BarChart: Null, Bar: Null, CartesianGrid: Null, Legend: Null,
    Tooltip: Null, XAxis: Null, YAxis: Null, LineChart: Null, Line: Null, AreaChart: Null, Area: Null,
  }
})

const FILTERS: CourierOrdersFilters = { status: "delivered", period: "", month: "", date_from: "", date_to: "" }

const order = (n: number, extra: Record<string, unknown> = {}) => ({
  _id: `o${n}`,
  order_number: `EX-2026-00${n}`,
  status: "delivered",
  total: 45000,
  createdAt: "2026-10-05T08:00:00Z",
  restaurant_id: { name: `Rest ${n}` },
  ...extra,
})

const profile = { _id: "c1", user_id: { _id: "u1", name: "Ali Valiyev", phone: "+998901112233", is_blocked: false }, status: "offline" }

const setup = (
  props: Partial<React.ComponentProps<typeof CourierDetailClient>> = {},
  query = "",
) => {
  mockQuery = query
  return render(
    <CourierDetailClient
      profile={profile}
      balanceData={{ balance: 0, transactions: [] }}
      orders={[order(1), order(2)]}
      ordersPagination={{ page: 1, totalPages: 4, total: 67 }}
      ordersFilters={FILTERS}
      {...props}
    />,
  )
}

const lastReplace = () => replace.mock.calls[replace.mock.calls.length - 1]
const lastUrl = () => lastReplace()[0] as string
const lastParams = () => new URLSearchParams(lastUrl().split("?")[1] ?? "")
const history = () => screen.getByText(/Buyurtmalar tarixi/).closest("div.rounded-xl") as HTMLElement
const prev = () => within(history()).getByRole("button", { name: "Oldingi sahifa" })
const next = () => within(history()).getByRole("button", { name: "Keyingi sahifa" })

beforeEach(() => {
  jest.clearAllMocks()
  mockQuery = ""
})

describe("history section", () => {
  it("is always rendered and shows the total, not the page size", () => {
    setup()
    expect(screen.getByText(/Buyurtmalar tarixi \(67\)/)).toBeInTheDocument()
  })

  it("lists the rows of the page (no 20-row slice)", () => {
    const many = Array.from({ length: 25 }, (_, i) => order(i + 1))
    setup({ orders: many, ordersPagination: { page: 1, totalPages: 2, total: 45 } })
    expect(within(history()).getAllByRole("link")).toHaveLength(25)
  })

  it("shows the empty state when there are no orders, and still renders the filters", () => {
    setup({ orders: [], ordersPagination: { page: 1, totalPages: 1, total: 0 } })
    expect(screen.getByText("Buyurtmalar topilmadi")).toBeInTheDocument()
    expect(screen.getByText(/Buyurtmalar tarixi \(0\)/)).toBeInTheDocument()
    expect(within(history()).getAllByRole("combobox").length).toBeGreaterThanOrEqual(2)
  })

  it("falls back to the row count and one page without pagination metadata", () => {
    setup({ ordersPagination: undefined })
    expect(screen.getByText(/Buyurtmalar tarixi \(2\)/)).toBeInTheDocument()
    expect(within(history()).queryByRole("button", { name: "Keyingi sahifa" })).not.toBeInTheDocument()
  })

  it("shows the status filter label for the active status", () => {
    setup({ ordersFilters: { ...FILTERS, status: "cancelled" } })
    expect(within(history()).getAllByRole("combobox")[0]).toHaveTextContent("Bekor qilingan")
  })

  it("the default status reads 'Yetkazilgan'", () => {
    setup()
    expect(within(history()).getAllByRole("combobox")[0]).toHaveTextContent("Yetkazilgan")
  })
})

describe("row links (back-link)", () => {
  it("each order number is a link to the order with the courier URL as `from`", () => {
    setup({}, "orders_page=2&orders_status=all")
    const link = within(history()).getByRole("link", { name: "EX-2026-001" })
    const href = link.getAttribute("href")!
    expect(href.startsWith("/orders/o1?from=")).toBe(true)
    const from = decodeURIComponent(href.split("from=")[1])
    expect(from).toBe("/couriers/c1?orders_page=2&orders_status=all")
  })

  it("`from` is the bare courier URL when there is no query", () => {
    setup()
    const href = within(history()).getByRole("link", { name: "EX-2026-001" }).getAttribute("href")!
    expect(decodeURIComponent(href.split("from=")[1])).toBe("/couriers/c1")
  })

  it("`from` is URL-encoded so its own & and = survive", () => {
    setup({}, "orders_page=2&orders_status=all")
    const href = within(history()).getByRole("link", { name: "EX-2026-001" }).getAttribute("href")!
    expect(href).not.toContain("&orders_status")
    expect(href).toContain("%26orders_status%3Dall")
  })

  it("clicking a row pushes the same href once; clicking the link does not also trigger the row", async () => {
    setup()
    const row = within(history()).getByText("Rest 1").closest("tr")!
    await userEvent.click(row)
    expect(push).toHaveBeenCalledTimes(1)
    expect(push.mock.calls[0][0]).toMatch(/^\/orders\/o1\?from=/)

    push.mockClear()
    // jsdom cannot navigate: stop the anchor's default action after React has handled the click.
    const stopNavigation = (e: Event) => e.preventDefault()
    document.addEventListener("click", stopNavigation)
    await userEvent.click(within(history()).getByRole("link", { name: "EX-2026-002" }))
    document.removeEventListener("click", stopNavigation)
    expect(push).not.toHaveBeenCalled()
  })
})

describe("pager", () => {
  it("is hidden with a single page", () => {
    setup({ ordersPagination: { page: 1, totalPages: 1, total: 2 } })
    expect(within(history()).queryByText(/Jami sahifalar/)).not.toBeInTheDocument()
    expect(within(history()).queryByLabelText("Sahifa raqami")).not.toBeInTheDocument()
  })

  it("shows the indicator and the total pages", () => {
    setup({ ordersPagination: { page: 2, totalPages: 4, total: 67 } })
    expect(within(history()).getByText("2 / 4")).toBeInTheDocument()
    expect(within(history()).getByText("Jami sahifalar: 4")).toBeInTheDocument()
  })

  it("previous is disabled on the first page, next on the last", () => {
    const { unmount } = setup({ ordersPagination: { page: 1, totalPages: 4, total: 67 } })
    expect(prev()).toBeDisabled()
    expect(next()).toBeEnabled()
    unmount()
    setup({ ordersPagination: { page: 4, totalPages: 4, total: 67 } })
    expect(prev()).toBeEnabled()
    expect(next()).toBeDisabled()
  })

  it("next writes orders_page=<page+1> and keeps the other filters", async () => {
    setup({ ordersPagination: { page: 2, totalPages: 4, total: 67 } }, "orders_status=all&orders_period=calendar_month&orders_month=2026-10&orders_page=2")
    await userEvent.click(next())
    const q = lastParams()
    expect(q.get("orders_page")).toBe("3")
    expect(q.get("orders_status")).toBe("all")
    expect(q.get("orders_period")).toBe("calendar_month")
    expect(q.get("orders_month")).toBe("2026-10")
  })

  it("previous to page 1 removes orders_page from the URL", async () => {
    setup({ ordersPagination: { page: 2, totalPages: 4, total: 67 } }, "orders_page=2")
    await userEvent.click(prev())
    expect(lastUrl()).toBe("/couriers/c1")
  })

  it("navigates with replace and scroll:false (no history entry, no jump to the top)", async () => {
    setup({ ordersPagination: { page: 1, totalPages: 4, total: 67 } })
    await userEvent.click(next())
    expect(lastReplace()[1]).toEqual({ scroll: false })
    expect(push).not.toHaveBeenCalled()
  })

  it("the jump input goes to the typed page", async () => {
    setup()
    await userEvent.type(within(history()).getByLabelText("Sahifa raqami"), "3{Enter}")
    expect(lastParams().get("orders_page")).toBe("3")
  })

  it("jump to page 1 removes the key; jump keeps other filters", async () => {
    setup({ ordersPagination: { page: 3, totalPages: 4, total: 67 } }, "orders_status=cancelled&orders_page=3")
    await userEvent.type(within(history()).getByLabelText("Sahifa raqami"), "1{Enter}")
    const q = lastParams()
    expect(q.has("orders_page")).toBe(false)
    expect(q.get("orders_status")).toBe("cancelled")
  })

  it("does not touch the URL keys of other sections of the page", async () => {
    setup({ ordersPagination: { page: 1, totalPages: 4, total: 67 } }, "tab=income&orders_page=1")
    await userEvent.click(next())
    expect(lastParams().get("tab")).toBe("income")
  })
})

describe("filters write the orders_* contract", () => {
  const pickStatus = async (label: string) => {
    await userEvent.click(within(history()).getAllByRole("combobox")[0])
    await userEvent.click(await screen.findByRole("option", { name: label }))
  }
  const pickPeriod = async (label: string) => {
    await userEvent.click(within(history()).getAllByRole("combobox")[1])
    await userEvent.click(await screen.findByRole("option", { name: label }))
  }

  it("'Barchasi' must be explicit in the URL", async () => {
    setup()
    await pickStatus("Barchasi")
    expect(lastParams().get("orders_status")).toBe("all")
  })

  it("'Bekor qilingan' is written", async () => {
    setup()
    await pickStatus("Bekor qilingan")
    expect(lastParams().get("orders_status")).toBe("cancelled")
  })

  it("'Yetkazilgan' (the default) is kept out of the URL", async () => {
    setup({ ordersFilters: { ...FILTERS, status: "all" } }, "orders_status=all")
    await pickStatus("Yetkazilgan")
    expect(lastParams().has("orders_status")).toBe(false)
  })

  it("changing any filter resets the page to 1", async () => {
    setup({ ordersPagination: { page: 3, totalPages: 4, total: 67 } }, "orders_page=3&orders_status=cancelled")
    await pickStatus("Barchasi")
    const q = lastParams()
    expect(q.has("orders_page")).toBe(false)
    expect(q.get("orders_status")).toBe("all")
  })

  it("a period change resets the page and writes orders_period (and the current month for 'Oy tanlash')", async () => {
    setup({ ordersPagination: { page: 3, totalPages: 4, total: 67 } }, "orders_page=3")
    await pickPeriod("Oy tanlash")
    const q = lastParams()
    expect(q.has("orders_page")).toBe(false)
    expect(q.get("orders_period")).toBe("calendar_month")
    expect(q.get("orders_month")).toMatch(/^\d{4}-\d{2}$/)
  })

  it("a month input writes orders_month and keeps the period", async () => {
    setup({ ordersFilters: { ...FILTERS, period: "calendar_month", month: "2026-10" } }, "orders_period=calendar_month&orders_month=2026-10")
    fireEvent.change(within(history()).getByLabelText("Oy"), { target: { value: "2026-09" } })
    const q = lastParams()
    expect(q.get("orders_month")).toBe("2026-09")
    expect(q.get("orders_period")).toBe("calendar_month")
  })

  it("range dates write orders_from / orders_to; clearing one removes only that key", async () => {
    setup(
      { ordersFilters: { ...FILTERS, period: "range", date_from: "2026-10-01", date_to: "2026-10-15" } },
      "orders_period=range&orders_from=2026-10-01&orders_to=2026-10-15",
    )
    fireEvent.change(within(history()).getByLabelText("Tugash sanasi"), { target: { value: "2026-10-20" } })
    expect(lastParams().get("orders_to")).toBe("2026-10-20")
    expect(lastParams().get("orders_from")).toBe("2026-10-01")

    fireEvent.change(within(history()).getByLabelText("Tugash sanasi"), { target: { value: "" } })
    expect(lastParams().has("orders_to")).toBe(false)
    expect(lastParams().get("orders_from")).toBe("2026-10-01")
  })

  it("switching to a fixed period drops the month and both dates from the URL", async () => {
    setup(
      { ordersFilters: { ...FILTERS, period: "range", date_from: "2026-10-01", date_to: "2026-10-15" } },
      "orders_period=range&orders_from=2026-10-01&orders_to=2026-10-15",
    )
    await pickPeriod("Hafta")
    const q = lastParams()
    expect(q.get("orders_period")).toBe("week")
    expect(q.has("orders_from")).toBe(false)
    expect(q.has("orders_to")).toBe(false)
    expect(q.has("orders_month")).toBe(false)
  })

  it("a backwards range shows the hint", () => {
    setup({ ordersFilters: { ...FILTERS, period: "range", date_from: "2026-10-15", date_to: "2026-10-01" } })
    expect(screen.getByText("Boshlanish sanasi tugash sanasidan keyin bo'lmasligi kerak.")).toBeInTheDocument()
  })
})
