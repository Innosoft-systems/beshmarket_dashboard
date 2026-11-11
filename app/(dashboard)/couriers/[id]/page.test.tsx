import CourierDetailPage from "./page"
import { apiRequest } from "@/lib/api/client"

/**
 * Courier history (R6): which request the page sends for a given URL, what it
 * hands to the client, and the past-the-end redirect. The server component is
 * called directly; the API client, session and navigation helpers are mocked.
 */

jest.mock("@/lib/auth/session", () => ({ getAccessToken: jest.fn().mockResolvedValue("token") }))
jest.mock("@/lib/api/client", () => ({ apiRequest: jest.fn() }))
jest.mock("@/components/couriers/CourierDetailClient", () => ({ CourierDetailClient: () => null }))
jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
  // like the real helper: control-flow errors pass through, everything else returns
  unstable_rethrow: (err: unknown) => {
    if (err instanceof Error && /^NEXT_(REDIRECT|NOT_FOUND)/.test(err.message)) throw err
  },
}))

const mockedApi = apiRequest as jest.MockedFunction<typeof apiRequest>

type OrdersPayload = { data: unknown[]; pagination: { page: number; totalPages: number; total: number } | null }
let ordersPayload: OrdersPayload | unknown[]
let ordersFails: boolean
let profile: unknown

beforeEach(() => {
  mockedApi.mockReset()
  // plenty of pages, so request-param tests are not redirected back from page > 1
  ordersPayload = { data: [], pagination: { page: 1, totalPages: 99, total: 1960 } }
  ordersFails = false
  profile = { _id: "c1", user_id: { name: "Ali" } }
  mockedApi.mockImplementation((async (path: string) => {
    if (path.startsWith("/orders?")) {
      if (ordersFails) throw new Error("boom")
      return { data: ordersPayload, status: 200 }
    }
    if (/^\/couriers\/[^/]+$/.test(path)) return { data: profile, status: 200 }
    return { data: null, status: 200 }
  }) as unknown as typeof apiRequest)
})

const render = (id: string, sp: Record<string, string> = {}) =>
  CourierDetailPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve(sp) }) as Promise<{
    props: Record<string, unknown> & { orders: unknown[]; ordersPagination: { page: number; totalPages: number; total: number }; ordersFilters: { status: string } }
  }>

const ordersCall = () => {
  const call = mockedApi.mock.calls.map((c) => c[0] as string).find((p) => p.startsWith("/orders?"))
  expect(call).toBeDefined()
  return new URLSearchParams(call!.split("?")[1])
}

describe("courier history request", () => {
  it("defaults to delivered orders, page 1, 20 per page, no date filter", async () => {
    await render("abc")
    const q = ordersCall()
    expect(Object.fromEntries(q)).toEqual({ courier_id: "abc", page: "1", limit: "20", status: "delivered" })
  })

  it("forwards the page (orders_page) and never the plain `page` key of other lists", async () => {
    await render("abc", { orders_page: "4", page: "9" })
    const q = ordersCall()
    expect(q.get("page")).toBe("4")
  })

  it.each([
    ["0", "1"],
    ["-2", "1"],
    ["1.5", "1"],
    ["abc", "1"],
    ["", "1"],
    ["3.9", "3"],
  ])("clamps orders_page %p to %p", async (raw, expected) => {
    await render("abc", { orders_page: raw })
    expect(ordersCall().get("page")).toBe(expected)
  })

  it("status 'all' sends no status filter", async () => {
    await render("abc", { orders_status: "all" })
    expect(ordersCall().has("status")).toBe(false)
  })

  it("status 'cancelled' is forwarded", async () => {
    await render("abc", { orders_status: "cancelled" })
    expect(ordersCall().get("status")).toBe("cancelled")
  })

  it.each(["pending", "delivered&x=1", "ALL", "", "<script>"])("an unknown status %p falls back to delivered", async (status) => {
    await render("abc", { orders_status: status })
    const q = ordersCall()
    expect(q.get("status")).toBe("delivered")
    expect(q.has("x")).toBe(false)
  })

  it("a calendar month becomes date_from / date_to (last day inclusive)", async () => {
    await render("abc", { orders_period: "calendar_month", orders_month: "2026-10" })
    const q = ordersCall()
    expect(q.get("date_from")).toBe("2026-10-01")
    expect(q.get("date_to")).toBe("2026-10-31")
  })

  it("a range becomes date_from / date_to, one-sided ranges send one key", async () => {
    await render("abc", { orders_period: "range", orders_from: "2026-10-01", orders_to: "2026-10-15" })
    expect(Object.fromEntries(ordersCall())).toMatchObject({ date_from: "2026-10-01", date_to: "2026-10-15" })

    mockedApi.mockClear()
    await render("abc", { orders_period: "range", orders_from: "2026-10-01" })
    const q = ordersCall()
    expect(q.get("date_from")).toBe("2026-10-01")
    expect(q.has("date_to")).toBe(false)
  })

  it("a backwards range sends no date filter at all", async () => {
    await render("abc", { orders_period: "range", orders_from: "2026-10-15", orders_to: "2026-10-01" })
    const q = ordersCall()
    expect(q.has("date_from")).toBe(false)
    expect(q.has("date_to")).toBe(false)
  })

  it("a fixed period (week) sends a 7-day window ending today (Tashkent)", async () => {
    await render("abc", { orders_period: "week" })
    const q = ordersCall()
    expect(q.get("date_from")).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(q.get("date_to")).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const days = (Date.parse(q.get("date_to")!) - Date.parse(q.get("date_from")!)) / 86_400_000
    expect(days).toBe(7)
  })

  it("filters combine: status + month + page", async () => {
    await render("abc", { orders_status: "cancelled", orders_period: "calendar_month", orders_month: "2026-02", orders_page: "2" })
    expect(Object.fromEntries(ordersCall())).toEqual({
      courier_id: "abc",
      page: "2",
      limit: "20",
      status: "cancelled",
      date_from: "2026-02-01",
      date_to: "2026-02-28",
    })
  })

  it("the courier id is URL-encoded as a query value, so it cannot add parameters", async () => {
    await render("abc&status=all")
    const call = mockedApi.mock.calls.map((c) => c[0] as string).find((p) => p.startsWith("/orders?"))!
    expect(call).toContain("courier_id=abc%26status%3Dall")
    expect(new URLSearchParams(call.split("?")[1]).get("status")).toBe("delivered")
  })
})

describe("courier history props for the client", () => {
  it("passes orders, pagination and the normalised filters", async () => {
    ordersPayload = { data: [{ _id: "o1" }, { _id: "o2" }], pagination: { page: 2, totalPages: 4, total: 67 } }
    const el = await render("abc", { orders_page: "2", orders_status: "all", orders_period: "calendar_month", orders_month: "2026-10" })
    expect(el.props.orders).toEqual([{ _id: "o1" }, { _id: "o2" }])
    expect(el.props.ordersPagination).toEqual({ page: 2, totalPages: 4, total: 67 })
    expect(el.props.ordersFilters).toEqual({ status: "all", period: "calendar_month", month: "2026-10", date_from: "", date_to: "" })
  })

  it("the default status shows as 'delivered' in the filters even without a URL key", async () => {
    const el = await render("abc")
    expect(el.props.ordersFilters.status).toBe("delivered")
  })

  it("an unknown status is normalised in the filters too", async () => {
    const el = await render("abc", { orders_status: "weird" })
    expect(el.props.ordersFilters.status).toBe("delivered")
  })

  it("without pagination metadata it falls back to the requested page, 1 page, and the row count", async () => {
    ordersPayload = { data: [{ _id: "o1" }], pagination: null }
    const el = await render("abc", { orders_page: "3" })
    expect(el.props.ordersPagination).toEqual({ page: 3, totalPages: 1, total: 1 })
  })

  it("accepts a bare array payload", async () => {
    ordersPayload = [{ _id: "o1" }, { _id: "o2" }]
    const el = await render("abc")
    expect(el.props.orders).toHaveLength(2)
    expect(el.props.ordersPagination.totalPages).toBe(1)
  })

  it("a failing history request degrades to an empty list instead of failing the page", async () => {
    ordersFails = true
    const el = await render("abc")
    expect(el.props.orders).toEqual([])
    expect(el.props.ordersPagination).toEqual({ page: 1, totalPages: 1, total: 0 })
  })

  it("an unknown courier is a 404", async () => {
    profile = null
    await expect(render("abc")).rejects.toThrow("NEXT_NOT_FOUND")
  })
})

describe("courier history: past the last page", () => {
  it("redirects to the last page and keeps the other orders_* filters", async () => {
    ordersPayload = { data: [], pagination: { page: 99, totalPages: 4, total: 67 } }
    await expect(
      render("abc", { orders_page: "99", orders_status: "all", orders_period: "calendar_month", orders_month: "2026-10" }),
    ).rejects.toThrow("NEXT_REDIRECT:/couriers/abc?orders_status=all&orders_period=calendar_month&orders_month=2026-10&orders_page=4")
  })

  it("redirect is not swallowed into a 404 by the catch block", async () => {
    ordersPayload = { data: [], pagination: { page: 9, totalPages: 2, total: 30 } }
    await expect(render("abc", { orders_page: "9" })).rejects.toThrow(/^NEXT_REDIRECT:/)
  })

  it("when the last page is 1 the orders_page key is dropped", async () => {
    ordersPayload = { data: [], pagination: { page: 9, totalPages: 1, total: 3 } }
    await expect(render("abc", { orders_page: "9", orders_status: "cancelled" })).rejects.toThrow(
      "NEXT_REDIRECT:/couriers/abc?orders_status=cancelled",
    )
  })

  it("the courier id is encoded in the redirect path", async () => {
    mockedApi.mockImplementation((async (path: string) =>
      path.startsWith("/orders?")
        ? { data: { data: [], pagination: { page: 9, totalPages: 2, total: 30 } }, status: 200 }
        : { data: { _id: "x" }, status: 200 }) as unknown as typeof apiRequest)
    await expect(render("a/b", { orders_page: "9" })).rejects.toThrow("NEXT_REDIRECT:/couriers/a%2Fb?orders_page=2")
  })

  it("does not redirect when the page is within range, nor for an empty history", async () => {
    ordersPayload = { data: [{ _id: "o1" }], pagination: { page: 4, totalPages: 4, total: 67 } }
    await expect(render("abc", { orders_page: "4" })).resolves.toBeDefined()

    ordersPayload = { data: [], pagination: { page: 5, totalPages: 0, total: 0 } }
    await expect(render("abc", { orders_page: "5" })).resolves.toBeDefined()
  })

  it("a hostile page value cannot produce a redirect away from the courier page", async () => {
    ordersPayload = { data: [], pagination: { page: 1, totalPages: 2, total: 30 } }
    await expect(render("abc", { orders_page: "//evil.com" })).resolves.toBeDefined() // clamps to 1: in range
  })
})
