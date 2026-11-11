import { isSafeInternalUrl } from "@/lib/utils/safe-url"
import {
  lastPageRedirect,
  ORDER_BACK_PREFIXES,
  ORDER_PERIOD_OPTIONS,
  parsePageParam,
  resolveBackHref,
  resolveOrderDateRange,
} from "./order-period"

/**
 * Edge cases on top of order-period.test.ts: Tashkent-vs-UTC around midnight,
 * open-ended ranges, the open-redirect guard (hostile and encoded inputs, both
 * panels, composed with isSafeInternalUrl as the callers do) and page clamping.
 */

afterEach(() => jest.useRealTimers())

/** Fake only Date, so promises and timers keep working. */
function freeze(iso: string) {
  jest.useFakeTimers({ now: new Date(iso), doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] })
}

describe("Tashkent day (UTC+5) vs UTC", () => {
  // Orders placed 00:00-05:00 Tashkent time are still the previous day in UTC.
  const cases: [string, string][] = [
    ["2026-11-08T18:59:59Z", "2026-11-08"], // 23:59:59 Tashkent, Nov 8
    ["2026-11-08T19:00:00Z", "2026-11-09"], // 00:00:00 Tashkent, Nov 9
    ["2026-11-08T23:59:59Z", "2026-11-09"], // 04:59:59 Tashkent, Nov 9 (still Nov 8 in UTC)
    ["2026-11-09T00:00:00Z", "2026-11-09"], // 05:00 Tashkent, same day in both
    ["2026-11-09T18:59:59Z", "2026-11-09"],
    ["2026-12-31T19:00:00Z", "2027-01-01"], // year boundary
  ]

  it.each(cases)("'today' at %s is the Tashkent day %s", (now, day) => {
    freeze(now)
    expect(resolveOrderDateRange({ period: "today" })).toEqual({ date_from: day, date_to: day })
  })

  it("'yesterday', 'week' and 'month' count back from the Tashkent day, inclusive of today", () => {
    freeze("2026-11-08T21:00:00Z") // 02:00 Nov 9 Tashkent, but Nov 8 in UTC
    expect(resolveOrderDateRange({ period: "yesterday" })).toEqual({ date_from: "2026-11-08", date_to: "2026-11-08" })
    expect(resolveOrderDateRange({ period: "week" })).toEqual({ date_from: "2026-11-02", date_to: "2026-11-09" })
    expect(resolveOrderDateRange({ period: "month" })).toEqual({ date_from: "2026-10-10", date_to: "2026-11-09" })
  })

  it("a UTC-based computation would have been a day behind in that window (sanity check of the premise)", () => {
    freeze("2026-11-08T21:00:00Z")
    expect(new Date().toISOString().split("T")[0]).toBe("2026-11-08")
    expect(resolveOrderDateRange({ period: "today" }).date_from).toBe("2026-11-09")
  })

  it("an explicit `today` argument wins over the clock", () => {
    freeze("2026-11-08T21:00:00Z")
    expect(resolveOrderDateRange({ period: "today" }, "2030-01-01")).toEqual({ date_from: "2030-01-01", date_to: "2030-01-01" })
  })

  it("fixed periods cross month and year ends", () => {
    expect(resolveOrderDateRange({ period: "yesterday" }, "2027-01-01")).toEqual({ date_from: "2026-12-31", date_to: "2026-12-31" })
    expect(resolveOrderDateRange({ period: "week" }, "2027-01-03")).toEqual({ date_from: "2026-12-27", date_to: "2027-01-03" })
    expect(resolveOrderDateRange({ period: "month" }, "2028-03-01")).toEqual({ date_from: "2028-01-31", date_to: "2028-03-01" })
  })
})

describe("calendar month picker", () => {
  const T = "2026-11-09"
  const month = (m: string) => resolveOrderDateRange({ period: "calendar_month", month: m }, T)

  it("covers 28, 29, 30 and 31 day months, and December", () => {
    expect(month("2026-02")).toEqual({ date_from: "2026-02-01", date_to: "2026-02-28" })
    expect(month("2028-02")).toEqual({ date_from: "2028-02-01", date_to: "2028-02-29" })
    expect(month("2026-04")).toEqual({ date_from: "2026-04-01", date_to: "2026-04-30" })
    expect(month("2026-12")).toEqual({ date_from: "2026-12-01", date_to: "2026-12-31" })
  })

  it("date_to is the last day itself (inclusive), never the first day of the next month", () => {
    expect(month("2026-10").date_to).toBe("2026-10-31")
    expect(month("2026-10").date_to).not.toBe("2026-11-01")
  })

  it.each(["2026-00", "2026-13", "2026-1", "26-10", "2026-10-01", " 2026-10", "", "undefined"])(
    "ignores the malformed month %p",
    (m) => {
      expect(month(m)).toEqual({})
    },
  )

  it("ignores range inputs while calendar_month is selected, and month while range is selected", () => {
    expect(
      resolveOrderDateRange({ period: "calendar_month", month: "2026-10", date_from: "2020-01-01", date_to: "2020-01-02" }, T),
    ).toEqual({ date_from: "2026-10-01", date_to: "2026-10-31" })
    expect(resolveOrderDateRange({ period: "range", month: "2026-10", date_from: "2026-10-05" }, T)).toEqual({
      date_from: "2026-10-05",
    })
  })
})

describe("date range (open-ended and inclusive)", () => {
  const T = "2026-11-09"
  const range = (date_from?: string, date_to?: string) => resolveOrderDateRange({ period: "range", date_from, date_to }, T)

  it("a single day (from = to) is valid and inclusive on both ends", () => {
    expect(range("2026-10-05", "2026-10-05")).toEqual({ date_from: "2026-10-05", date_to: "2026-10-05" })
  })

  it("open start: only date_to is sent", () => {
    expect(range(undefined, "2026-10-15")).toEqual({ date_to: "2026-10-15" })
    expect(range("", "2026-10-15")).toEqual({ date_to: "2026-10-15" })
  })

  it("open end: only date_from is sent", () => {
    expect(range("2026-10-01", undefined)).toEqual({ date_from: "2026-10-01" })
    expect(range("2026-10-01", "")).toEqual({ date_from: "2026-10-01" })
  })

  it("neither date: no filter", () => {
    expect(range()).toEqual({})
    expect(range("", "")).toEqual({})
  })

  it("a malformed side is dropped, the valid side stays", () => {
    expect(range("2026-10-01", "15.10.2026")).toEqual({ date_from: "2026-10-01" })
    expect(range("nope", "2026-10-15")).toEqual({ date_to: "2026-10-15" })
    expect(range("nope", "nope")).toEqual({})
    expect(range("2026-10-1", "2026-10-15")).toEqual({ date_to: "2026-10-15" })
  })

  it("a backwards range means no date filter at all (not a partial one)", () => {
    expect(range("2026-10-15", "2026-10-01")).toEqual({})
    expect(range("2027-01-01", "2026-12-31")).toEqual({})
  })

  it("a range may span years and does not depend on today", () => {
    expect(range("2025-12-01", "2026-01-31")).toEqual({ date_from: "2025-12-01", date_to: "2026-01-31" })
  })

  it("returns plain keys only (no undefined values the URL builder could stringify)", () => {
    const keys = Object.keys(range("2026-10-01", undefined))
    expect(keys).toEqual(["date_from"])
  })
})

describe("ORDER_PERIOD_OPTIONS", () => {
  it("lists every resolvable period plus 'all', with unique values", () => {
    const values = ORDER_PERIOD_OPTIONS.map((o) => o.value)
    expect(new Set(values).size).toBe(values.length)
    expect(values).toEqual(["all", "today", "yesterday", "week", "month", "calendar_month", "range"])
    for (const v of values) expect(typeof resolveOrderDateRange({ period: v }, "2026-11-09")).toBe("object")
  })
})

describe("back-link guard (open redirect)", () => {
  const ADMIN_FB = "/orders"
  const REST_FB = "/restaurant/orders"

  const hostile = [
    "https://evil.com",
    "http://evil.com/orders",
    "HTTPS://EVIL.COM",
    "//evil.com",
    "//evil.com/orders",
    "///evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "\\/evil.com",
    "/\\/evil.com",
    "/orders\\evil.com",
    "/orders/..\\..\\evil.com",
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "mailto:a@b.c",
    "evil.com",
    "orders",
    " /orders",
    "\t/orders",
    "\n//evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\r/evil.com",
    // percent-encoded variants: the guard compares the decoded string it is given
    // and must also refuse look-alikes that only decode to a hostile URL later
    "%2F%2Fevil.com",
    "/%2Fevil.com",
    "/%5Cevil.com",
    "%5C%5Cevil.com",
    "/%09/evil.com",
    "%68ttps://evil.com",
    "https%3A%2F%2Fevil.com",
    "/orders%2F..%2F..%2Fevil.com",
    "/orders%5C..%5Cevil.com",
    "/ordersevil",
    "/orders-evil",
    "/orders.evil.com",
    "/ORDERS",
    "/couriers",
    "/couriers/",
    "/couriersevil/1",
    "/settings",
    "/api/logout",
    "/",
    "",
  ]

  it.each(hostile)("admin scope falls back for %p", (from) => {
    expect(resolveBackHref(from, ADMIN_FB)).toBe(ADMIN_FB)
  })

  it.each(hostile)("restaurant scope falls back for %p", (from) => {
    expect(resolveBackHref(from, REST_FB, "restaurant")).toBe(REST_FB)
  })

  it("falls back for null and undefined", () => {
    expect(resolveBackHref(null, ADMIN_FB)).toBe(ADMIN_FB)
    expect(resolveBackHref(undefined, REST_FB, "restaurant")).toBe(REST_FB)
  })

  describe("per-panel allow-list", () => {
    it("admin accepts /orders, /orders/..., /couriers/<id> and nothing from the restaurant panel", () => {
      for (const ok of ["/orders", "/orders?page=2", "/orders/abc123", "/orders/group/abc", "/couriers/abc", "/couriers/abc?orders_page=2&orders_status=all"]) {
        expect(resolveBackHref(ok, "/x")).toBe(ok)
      }
      for (const no of ["/restaurant/orders", "/restaurant/orders?page=2", "/restaurant/orders/abc"]) {
        expect(resolveBackHref(no, "/x")).toBe("/x")
      }
    })

    it("restaurant accepts only /restaurant/orders (+ query/sub-paths) and nothing from the admin panel", () => {
      for (const ok of ["/restaurant/orders", "/restaurant/orders?page=3&status=delivered", "/restaurant/orders/abc"]) {
        expect(resolveBackHref(ok, "/x", "restaurant")).toBe(ok)
      }
      for (const no of ["/orders", "/orders?page=2", "/couriers/abc", "/restaurant", "/restaurant/ordersevil", "/restaurant/orders-x"]) {
        expect(resolveBackHref(no, "/x", "restaurant")).toBe("/x")
      }
    })

    it("the allow-list is exactly the documented one", () => {
      expect(ORDER_BACK_PREFIXES).toEqual({ admin: ["/orders", "/couriers/"], restaurant: ["/restaurant/orders"] })
    })

    it("a prefix match needs a whole path segment: /orders matches /orders, /orders?x, /orders/x only", () => {
      expect(resolveBackHref("/orders#frag", "/x")).toBe("/x")
      expect(resolveBackHref("/orders2", "/x")).toBe("/x")
    })
  })

  describe("composed with isSafeInternalUrl, as OrderDetailClient does", () => {
    // jsdom's window.location.origin is http://localhost
    const accept = (from: string, scope: "admin" | "restaurant") => {
      const fb = scope === "admin" ? ADMIN_FB : REST_FB
      return isSafeInternalUrl(from) ? resolveBackHref(from, fb, scope) : fb
    }

    it.each(hostile)("never lets %p through", (from) => {
      for (const scope of ["admin", "restaurant"] as const) {
        const result = accept(from, scope)
        const fb = scope === "admin" ? ADMIN_FB : REST_FB
        // either the fallback, or a same-origin path under the panel's own prefixes
        if (result !== fb) {
          expect(new URL(result, "http://localhost").origin).toBe("http://localhost")
          expect(ORDER_BACK_PREFIXES[scope].some((p) => result.startsWith(p))).toBe(true)
        }
      }
    })

    it("every accepted result stays on the app origin, whatever the query string holds", () => {
      const withHostileQuery = [
        "/orders?next=https://evil.com",
        "/orders?from=//evil.com",
        "/orders?page=1&x=\\evil.com".replace("\\", "%5C"),
        "/couriers/abc?orders_status=all&u=http://evil.com",
        "/orders/abc?from=%2Forders",
      ]
      for (const from of withHostileQuery) {
        const result = accept(from, "admin")
        expect(new URL(result, "http://localhost").origin).toBe("http://localhost")
      }
    })

    it("accepts a same-origin absolute URL through isSafeInternalUrl but the allow-list still rejects it (absolute URLs are never used)", () => {
      expect(isSafeInternalUrl("http://localhost/orders?page=2")).toBe(true)
      expect(resolveBackHref("http://localhost/orders?page=2", ADMIN_FB)).toBe(ADMIN_FB)
    })

    it("round-trips what OrdersTableClient writes: encodeURIComponent(list URL) decodes to an accepted path", () => {
      const list = "/orders?page=25&status=delivered&period=calendar_month&month=2026-10&search=ali%20valiyev"
      const decoded = decodeURIComponent(encodeURIComponent(list))
      expect(accept(decoded, "admin")).toBe(list)
    })
  })
})

describe("page clamping", () => {
  describe("parsePageParam", () => {
    it.each([
      ["1", 1],
      ["2", 2],
      ["25", 25],
      ["1.5", 1],
      ["1.999", 1],
      ["7.0", 7],
      ["0", 1],
      ["0.5", 1],
      ["-1", 1],
      ["-3.7", 1],
      ["-0", 1],
      ["", 1],
      ["   ", 1],
      ["abc", 1],
      ["12abc", 1],
      ["NaN", 1],
      ["Infinity", 1],
      ["-Infinity", 1],
      [undefined, 1],
      [" 7 ", 7],
      ["1e3", 1000],
    ])("%p -> %p", (raw, expected) => {
      expect(parsePageParam(raw as string | undefined)).toBe(expected)
    })

    it("always returns an integer >= 1 for any input", () => {
      const inputs = ["", "0", "-9", "3.14", "x", "99999999999", "1e9", "0x10", "٣", "1,5"]
      for (const raw of inputs) {
        const n = parsePageParam(raw)
        expect(Number.isInteger(n)).toBe(true)
        expect(n).toBeGreaterThanOrEqual(1)
      }
    })

    it("huge values stay finite integers so lastPageRedirect can bring them back", () => {
      const n = parsePageParam("99999999999")
      expect(n).toBe(99999999999)
      expect(lastPageRedirect("/orders", { page: "99999999999" }, "page", n, 4)).toBe("/orders?page=4")
    })
  })

  describe("lastPageRedirect", () => {
    it("redirects exactly when page > totalPages", () => {
      expect(lastPageRedirect("/orders", {}, "page", 4, 4)).toBeNull()
      expect(lastPageRedirect("/orders", {}, "page", 5, 4)).toBe("/orders?page=4")
    })

    it("page 1 (what 0, negative and 1.5 become) never redirects while there is at least one page", () => {
      for (const raw of ["0", "-5", "1.5", "abc", ""]) {
        const page = parsePageParam(raw)
        expect(lastPageRedirect("/orders", { page: raw }, "page", page, 3)).toBeNull()
        expect(lastPageRedirect("/orders", { page: raw }, "page", page, 1)).toBeNull()
      }
    })

    it("does not redirect an empty list or unknown/invalid totals", () => {
      for (const total of [0, undefined, -1, Number.NaN]) {
        expect(lastPageRedirect("/orders", { page: "9" }, "page", 9, total as number | undefined)).toBeNull()
      }
    })

    it("a one-page list drops the page key and keeps the rest", () => {
      expect(lastPageRedirect("/orders", { page: "9", status: "cancelled" }, "page", 9, 1)).toBe("/orders?status=cancelled")
    })

    it("keeps repeated and encoded params, and ignores undefined ones", () => {
      expect(
        lastPageRedirect(
          "/orders",
          { page: "50", status: ["a", "b"], search: "ali valiyev & co", gone: undefined },
          "page",
          50,
          2,
        ),
      ).toBe("/orders?status=a&status=b&search=ali+valiyev+%26+co&page=2")
    })

    it("only the given page key is replaced (courier history keeps the other orders_* keys)", () => {
      expect(
        lastPageRedirect(
          "/couriers/abc",
          { orders_page: "9", orders_status: "all", orders_period: "calendar_month", orders_month: "2026-10", page: "3" },
          "orders_page",
          9,
          4,
        ),
      ).toBe("/couriers/abc?orders_status=all&orders_period=calendar_month&orders_month=2026-10&page=3&orders_page=4")
    })

    it("an array-valued page key is removed, not duplicated", () => {
      expect(lastPageRedirect("/orders", { page: ["8", "9"] }, "page", 9, 4)).toBe("/orders?page=4")
    })

    it("keeps an already-encoded path segment untouched", () => {
      expect(lastPageRedirect("/couriers/a%2Fb", { orders_page: "9" }, "orders_page", 9, 2)).toBe("/couriers/a%2Fb?orders_page=2")
    })

    it("cannot loop: the target page is always within range, page 1 drops the key", () => {
      for (const total of [1, 2, 7, 40]) {
        const url = lastPageRedirect("/orders", { page: String(total + 100) }, "page", total + 100, total)!
        const target = parsePageParam(new URL(url, "http://x").searchParams.get("page") ?? undefined)
        expect(target).toBeLessThanOrEqual(total)
        expect(lastPageRedirect("/orders", Object.fromEntries(new URL(url, "http://x").searchParams), "page", target, total)).toBeNull()
      }
    })
  })
})
