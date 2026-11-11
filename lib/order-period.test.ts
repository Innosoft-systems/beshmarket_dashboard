import { lastPageRedirect, parsePageParam, resolveBackHref, resolveOrderDateRange, shiftDay } from "./order-period"

describe("order-period", () => {
  afterEach(() => jest.useRealTimers())

  const TODAY = "2026-11-09"

  it("shifts calendar days across month and year boundaries", () => {
    expect(shiftDay("2026-11-01", -1)).toBe("2026-10-31")
    expect(shiftDay("2026-01-01", -1)).toBe("2025-12-31")
    expect(shiftDay("2028-02-28", 1)).toBe("2028-02-29")
  })

  it("keeps the meaning of the existing fixed periods", () => {
    expect(resolveOrderDateRange({ period: "today" }, TODAY)).toEqual({ date_from: TODAY, date_to: TODAY })
    expect(resolveOrderDateRange({ period: "yesterday" }, TODAY)).toEqual({ date_from: "2026-11-08", date_to: "2026-11-08" })
    expect(resolveOrderDateRange({ period: "week" }, TODAY)).toEqual({ date_from: "2026-11-02", date_to: TODAY })
    expect(resolveOrderDateRange({ period: "month" }, TODAY)).toEqual({ date_from: "2026-10-10", date_to: TODAY })
  })

  it("returns no filter for 'all', empty and unknown periods", () => {
    expect(resolveOrderDateRange({}, TODAY)).toEqual({})
    expect(resolveOrderDateRange({ period: "all" }, TODAY)).toEqual({})
    expect(resolveOrderDateRange({ period: "bogus" }, TODAY)).toEqual({})
  })

  it("resolves a calendar month to its first and last day", () => {
    expect(resolveOrderDateRange({ period: "calendar_month", month: "2026-10" }, TODAY))
      .toEqual({ date_from: "2026-10-01", date_to: "2026-10-31" })
    expect(resolveOrderDateRange({ period: "calendar_month", month: "2028-02" }, TODAY))
      .toEqual({ date_from: "2028-02-01", date_to: "2028-02-29" })
  })

  it("ignores a missing or malformed month", () => {
    expect(resolveOrderDateRange({ period: "calendar_month" }, TODAY)).toEqual({})
    expect(resolveOrderDateRange({ period: "calendar_month", month: "2026-13" }, TODAY)).toEqual({})
    expect(resolveOrderDateRange({ period: "calendar_month", month: "oct" }, TODAY)).toEqual({})
  })

  it("passes a valid range through, including one-sided ranges", () => {
    expect(resolveOrderDateRange({ period: "range", date_from: "2026-10-01", date_to: "2026-10-15" }, TODAY))
      .toEqual({ date_from: "2026-10-01", date_to: "2026-10-15" })
    expect(resolveOrderDateRange({ period: "range", date_from: "2026-10-01" }, TODAY)).toEqual({ date_from: "2026-10-01" })
    expect(resolveOrderDateRange({ period: "range", date_to: "2026-10-15" }, TODAY)).toEqual({ date_to: "2026-10-15" })
    expect(resolveOrderDateRange({ period: "range" }, TODAY)).toEqual({})
  })

  it("drops a backwards or malformed range", () => {
    expect(resolveOrderDateRange({ period: "range", date_from: "2026-10-15", date_to: "2026-10-01" }, TODAY)).toEqual({})
    expect(resolveOrderDateRange({ period: "range", date_from: "15.10.2026", date_to: "2026-10-20" }, TODAY))
      .toEqual({ date_to: "2026-10-20" })
  })

  it("defaults 'today' to the Tashkent calendar day, not UTC", () => {
    jest.useFakeTimers({ now: new Date("2026-11-08T20:30:00Z"), doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] })
    expect(resolveOrderDateRange({ period: "today" })).toEqual({ date_from: "2026-11-09", date_to: "2026-11-09" })
  })

  describe("resolveBackHref", () => {
    const FB = "/orders"

    it("accepts list pages with their query string", () => {
      expect(resolveBackHref("/orders?page=25&status=delivered", FB)).toBe("/orders?page=25&status=delivered")
      expect(resolveBackHref("/orders", FB)).toBe("/orders")
      expect(resolveBackHref("/couriers/abc123?orders_page=2", FB)).toBe("/couriers/abc123?orders_page=2")
    })

    it("only allows the caller's own panel (N4)", () => {
      expect(resolveBackHref("/restaurant/orders?page=3", FB)).toBe(FB)
      const RFB = "/restaurant/orders"
      expect(resolveBackHref("/restaurant/orders?page=3", RFB, "restaurant")).toBe("/restaurant/orders?page=3")
      expect(resolveBackHref("/restaurant/orders/abc", RFB, "restaurant")).toBe("/restaurant/orders/abc")
      expect(resolveBackHref("/orders?page=25", RFB, "restaurant")).toBe(RFB)
      expect(resolveBackHref("/couriers/abc123", RFB, "restaurant")).toBe(RFB)
      expect(resolveBackHref("https://evil.com", RFB, "restaurant")).toBe(RFB)
    })

    it("rejects external, protocol-relative and look-alike URLs", () => {
      expect(resolveBackHref("https://evil.com", FB)).toBe(FB)
      expect(resolveBackHref("//evil.com/orders", FB)).toBe(FB)
      expect(resolveBackHref("/\\evil.com", FB)).toBe(FB)
      expect(resolveBackHref("/orders\\..\\evil", FB)).toBe(FB)
      expect(resolveBackHref("/ordersevil", FB)).toBe(FB)
      expect(resolveBackHref("/couriers/", FB)).toBe(FB)
      expect(resolveBackHref("/settings", FB)).toBe(FB)
      expect(resolveBackHref("javascript:alert(1)", FB)).toBe(FB)
      expect(resolveBackHref(null, FB)).toBe(FB)
      expect(resolveBackHref("", FB)).toBe(FB)
    })
  })

  describe("parsePageParam (N3)", () => {
    it("floors to an integer >= 1", () => {
      expect(parsePageParam("25")).toBe(25)
      expect(parsePageParam("1.5")).toBe(1)
      expect(parsePageParam("3.9")).toBe(3)
      expect(parsePageParam("0")).toBe(1)
      expect(parsePageParam("-3")).toBe(1)
      expect(parsePageParam("abc")).toBe(1)
      expect(parsePageParam("")).toBe(1)
      expect(parsePageParam(undefined)).toBe(1)
      expect(parsePageParam("Infinity")).toBe(1)
    })
  })

  describe("lastPageRedirect (N2)", () => {
    it("returns null while the page is in range or the list is empty", () => {
      expect(lastPageRedirect("/orders", { page: "4" }, "page", 4, 4)).toBeNull()
      expect(lastPageRedirect("/orders", { page: "2" }, "page", 2, 4)).toBeNull()
      expect(lastPageRedirect("/orders", { page: "5" }, "page", 5, 0)).toBeNull()
      expect(lastPageRedirect("/orders", { page: "5" }, "page", 5, undefined)).toBeNull()
    })

    it("points past-the-end pages at the last page and keeps the other params", () => {
      expect(lastPageRedirect("/orders", { page: "999", status: "delivered", period: "calendar_month", month: "2026-10" }, "page", 999, 4))
        .toBe("/orders?status=delivered&period=calendar_month&month=2026-10&page=4")
      expect(lastPageRedirect("/couriers/abc", { orders_page: "9", orders_status: "all", tab: undefined }, "orders_page", 9, 3))
        .toBe("/couriers/abc?orders_status=all&orders_page=3")
    })

    it("drops the page param when the last page is 1", () => {
      expect(lastPageRedirect("/restaurant/orders", { page: "7", search: "a b" }, "page", 7, 1)).toBe("/restaurant/orders?search=a+b")
      expect(lastPageRedirect("/orders", { page: "7" }, "page", 7, 1)).toBe("/orders")
    })
  })
})
