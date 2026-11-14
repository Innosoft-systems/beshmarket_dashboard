import { formatAgo, formatTashkentDateTime, hiddenReasonRows, runProgress } from "./integrations"
import type { IntegrationRunSummary } from "@/types/integration"

describe("formatTashkentDateTime", () => {
  it("formats in Tashkent (UTC+5)", () => {
    expect(formatTashkentDateTime("2026-11-14T08:05:00.000Z")).toBe("14.11.2026 13:05")
    expect(formatTashkentDateTime("2026-11-14T20:30:00.000Z")).toBe("15.11.2026 01:30")
  })
  it.each([null, undefined, "", "not a date"])("%p → —", (v) => {
    expect(formatTashkentDateTime(v as string | null | undefined)).toBe("—")
  })
})

describe("formatAgo", () => {
  const now = Date.parse("2026-11-14T12:00:00.000Z")
  it.each([
    ["2026-11-14T11:59:30.000Z", "hozirgina"],
    ["2026-11-14T11:55:00.000Z", "5 daqiqa oldin"],
    ["2026-11-14T09:00:00.000Z", "3 soat oldin"],
    ["2026-11-12T12:00:00.000Z", "2 kun oldin"],
    ["2026-11-14T12:05:00.000Z", "hozirgina"],
  ])("%s → %s", (iso, text) => {
    expect(formatAgo(iso, now)).toBe(text)
  })
  it("null for missing", () => {
    expect(formatAgo(null, now)).toBeNull()
    expect(formatAgo("x", now)).toBeNull()
  })
})

describe("hiddenReasonRows", () => {
  it("keeps non-zero counts with labels, largest first", () => {
    expect(hiddenReasonRows({ missing: 2, weighted: 8, no_price: 0 })).toEqual([
      { reason: "weighted", label: "Tarozi mahsuloti", count: 8 },
      { reason: "missing", label: "1C da yo'q", count: 2 },
    ])
  })
  it("handles empty input", () => {
    expect(hiddenReasonRows(undefined)).toEqual([])
    expect(hiddenReasonRows({})).toEqual([])
  })
})

describe("runProgress", () => {
  it("shows done/total batches", () => {
    expect(runProgress({ batches_done: [1, 2, 3], batch_total: 5 } as IntegrationRunSummary)).toBe("3/5")
    expect(runProgress(null)).toBe("—")
  })
})
