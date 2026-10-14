import {
  formatRange,
  isRangeInvalid,
  monthBounds,
  resolvePeriod,
  shiftMonth,
  todayTashkent,
} from "./subscribers-period"

/** Fake only Date so promises and timers keep working. */
function freezeDate(iso: string) {
  jest.useFakeTimers({
    now: new Date(iso),
    doNotFake: [
      "nextTick", "setImmediate", "clearImmediate", "setInterval", "clearInterval",
      "setTimeout", "clearTimeout", "queueMicrotask", "requestAnimationFrame",
      "cancelAnimationFrame", "requestIdleCallback", "cancelIdleCallback", "performance", "hrtime",
    ],
  })
}

describe("subscribers-period", () => {
  afterEach(() => jest.useRealTimers())

  it("uses the Tashkent calendar day, not UTC", () => {
    freezeDate("2026-09-30T20:30:00Z") // already Oct 1 in Tashkent
    expect(todayTashkent()).toBe("2026-10-01")
    freezeDate("2026-09-30T18:59:00Z")
    expect(todayTashkent()).toBe("2026-09-30")
  })

  it("computes month bounds incl. leap years and 30/31-day months", () => {
    expect(monthBounds("2026-10")).toEqual({ from: "2026-10-01", to: "2026-10-31" })
    expect(monthBounds("2026-09")).toEqual({ from: "2026-09-01", to: "2026-09-30" })
    expect(monthBounds("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" })
    expect(monthBounds("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" })
  })

  it("shifts months across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12")
    expect(shiftMonth("2026-12", 1)).toBe("2027-01")
  })

  it("formats ranges as dd.mm.yyyy", () => {
    expect(formatRange("2026-10-01", "2026-10-31")).toBe("01.10.2026 – 31.10.2026")
  })

  it("detects backwards ranges only when both dates are set", () => {
    expect(isRangeInvalid("2026-10-10", "2026-10-01")).toBe(true)
    expect(isRangeInvalid("2026-10-01", "2026-10-01")).toBe(false)
    expect(isRangeInvalid("", "2026-10-01")).toBe(false)
  })

  describe("resolvePeriod", () => {
    beforeEach(() => freezeDate("2026-10-14T10:00:00Z"))

    it("current month", () => {
      expect(resolvePeriod("current", "", "", "")).toEqual({ from: "2026-10-01", to: "2026-10-31" })
    })
    it("previous month", () => {
      expect(resolvePeriod("previous", "", "", "")).toEqual({ from: "2026-09-01", to: "2026-09-30" })
    })
    it("previous month in January goes to last December", () => {
      freezeDate("2026-01-05T10:00:00Z")
      expect(resolvePeriod("previous", "", "", "")).toEqual({ from: "2025-12-01", to: "2025-12-31" })
    })
    it("picked month, or null while empty", () => {
      expect(resolvePeriod("month", "2026-02", "", "")).toEqual({ from: "2026-02-01", to: "2026-02-28" })
      expect(resolvePeriod("month", "", "", "")).toBeNull()
    })
    it("custom range, or null when incomplete or backwards", () => {
      expect(resolvePeriod("range", "", "2026-10-01", "2026-10-10")).toEqual({ from: "2026-10-01", to: "2026-10-10" })
      expect(resolvePeriod("range", "", "", "2026-10-10")).toBeNull()
      expect(resolvePeriod("range", "", "2026-10-11", "2026-10-10")).toBeNull()
    })
  })
})
