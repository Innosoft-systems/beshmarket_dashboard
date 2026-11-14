import {
  AUTO_CHOICE,
  IGNORE_CHOICE,
  applyChoice,
  categoryChoice,
  choiceToBody,
  errorCodeCounts,
  formatAgo,
  formatChangeValue,
  formatGroupPath,
  formatTashkentDateTime,
  groupDiff,
  hiddenReasonRows,
  isBucketRun,
  addMinutesHHMM,
  isDailyFullMissing,
  lastDailyFullSlot,
  liveRefusalTarget,
  normaliseCategoriesData,
  orderedChanges,
  runBatches,
  runCountersSummary,
  runDuration,
  runLabel,
  runProgress,
} from "./integrations"
import type { CategoryMap, IntegrationRunSummary, RunDiffItem } from "@/types/integration"

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


const fullRun = (o: Partial<IntegrationRunSummary> = {}): IntegrationRunSummary => ({
  _id: "r1",
  kind: "catalog",
  sync_id: "full-2026-11-14",
  mode: "full",
  is_bucket: false,
  dry_run: false,
  status: "complete",
  batch_total: 4,
  batches_done: [1, 2, 3, 4],
  first_batch_at: "2026-11-14T09:00:00.000Z",
  finished_at: "2026-11-14T09:02:05.000Z",
  counters: {},
  ...o,
})

describe("run helpers (A2)", () => {
  it("detects hourly delta buckets by flag or sync_id prefix", () => {
    expect(isBucketRun(fullRun())).toBe(false)
    expect(isBucketRun(fullRun({ is_bucket: true }))).toBe(true)
    expect(isBucketRun(fullRun({ is_bucket: undefined, sync_id: "delta:catalog:2026111409" }))).toBe(true)
  })

  it("labels a bucket with its Tashkent hour and a full run as To'liq", () => {
    // 09:20 UTC = 14:20 Tashkent
    expect(runLabel(fullRun({ is_bucket: true, first_batch_at: "2026-11-14T09:20:00.000Z" }))).toBe(
      "O'zgarishlar, 14:00–15:00",
    )
    expect(runLabel(fullRun({ is_bucket: true, first_batch_at: "2026-11-14T18:30:00.000Z" }))).toBe(
      "O'zgarishlar, 23:00–00:00",
    )
    expect(runLabel(fullRun())).toBe("To'liq")
  })

  it("shows batches only for full runs", () => {
    expect(runBatches(fullRun({ batches_done: [1, 2], batch_total: 5 }))).toBe("2/5")
    expect(runBatches(fullRun({ is_bucket: true }))).toBeNull()
  })

  it("formats duration", () => {
    expect(runDuration(fullRun())).toBe("2 daq 5 son")
    expect(runDuration(fullRun({ finished_at: "2026-11-14T09:00:45.000Z" }))).toBe("45 son")
    expect(runDuration(fullRun({ finished_at: "2026-11-14T10:03:00.000Z" }))).toBe("1 soat 3 daq")
    expect(runDuration(fullRun({ first_batch_at: null }))).toBeNull()
  })

  it("summarises non-zero counters", () => {
    expect(runCountersSummary(fullRun({ counters: { created: 12, rejected: 3, unchanged: 400 } }))).toBe(
      "12 yangi · 3 xato",
    )
    expect(runCountersSummary(fullRun({ counters: { unchanged: 5 } }))).toBe("o'zgarish yo'q")
  })

  it("groups the diff sample by op in a fixed order", () => {
    const items: RunDiffItem[] = [
      { op: "deactivate", external_id: "a", name: "A" },
      { op: "create", external_id: "b", name: "B" },
      { op: "create", external_id: "c", name: "C" },
    ]
    expect(groupDiff(items).map((g) => [g.label, g.items.length])).toEqual([
      ["Yangi", 2],
      ["Yashiriladi", 1],
    ])
    expect(groupDiff(null)).toEqual([])
  })

  it("orders changes name, price, then the rest", () => {
    const keys = orderedChanges({
      stock: { from: 1, to: 2 },
      price: { from: 1, to: 2 },
      name_ru: { from: "a", to: "b" },
      is_active: { from: true, to: false },
    }).map(([k]) => k)
    expect(keys).toEqual(["name_ru", "price", "is_active", "stock"])
  })

  it("formats change values", () => {
    expect(formatChangeValue(12500)).toBe((12500).toLocaleString("ru-RU"))
    expect(formatChangeValue(true)).toBe("ha")
    expect(formatChangeValue(null)).toBe("—")
    expect(formatChangeValue(["x", "y"])).toBe("2 ta")
  })

  it("counts error codes", () => {
    expect(
      errorCodeCounts([
        { external_id: "1", code: "INVALID_FIELD", message: "" },
        { external_id: "2", code: "MISSING_FIELD", message: "" },
        { external_id: "3", code: "INVALID_FIELD", message: "" },
      ]),
    ).toEqual([
      { code: "INVALID_FIELD", count: 2 },
      { code: "MISSING_FIELD", count: 1 },
    ])
  })
})

describe("daily full (rev 3)", () => {
  const at = (iso: string) => Date.parse(iso)

  it("adds minutes to HH:mm across midnight", () => {
    expect(addMinutesHHMM("03:00", 180)).toBe("06:00")
    expect(addMinutesHHMM("23:30", 180)).toBe("02:30")
  })

  it("finds the last slot whose deadline (+3 h) has passed, like the backend", () => {
    // 06:05 Tashkent = 01:05 UTC: today's 03:00 slot (22:00 UTC the day before) is past its 06:00 deadline.
    const s1 = lastDailyFullSlot("03:00", at("2026-11-14T01:05:00.000Z"))
    expect(new Date(s1.start).toISOString()).toBe("2026-11-13T22:00:00.000Z")
    expect(new Date(s1.deadline).toISOString()).toBe("2026-11-14T01:00:00.000Z")
    // 05:00 Tashkent: today's deadline not reached yet → yesterday's slot.
    const s2 = lastDailyFullSlot("03:00", at("2026-11-14T00:00:00.000Z"))
    expect(new Date(s2.start).toISOString()).toBe("2026-11-12T22:00:00.000Z")
    // 23:30 slot, deadline 02:30 the next day.
    const s3 = lastDailyFullSlot("23:30", at("2026-11-13T21:40:00.000Z")) // 02:40 Tashkent on the 14th
    expect(new Date(s3.start).toISOString()).toBe("2026-11-13T18:30:00.000Z")
  })

  const conn = {
    enabled: true,
    catalog_mode: "live" as const,
    daily_full_at: "03:00",
    createdAt: "2026-11-01T00:00:00.000Z",
  }
  const now = at("2026-11-14T01:05:00.000Z") // 06:05 Tashkent

  it("flags a missing full only past the deadline, while catalog is live", () => {
    expect(isDailyFullMissing({ ...conn, last_full_catalog_success_at: null }, now)).toBe(true)
    // A full at 03:10 Tashkent today → fine.
    expect(isDailyFullMissing({ ...conn, last_full_catalog_success_at: "2026-11-13T22:10:00.000Z" }, now)).toBe(false)
    // Started up to 1 h early (02:10) still counts.
    expect(isDailyFullMissing({ ...conn, last_full_catalog_success_at: "2026-11-13T21:10:00.000Z" }, now)).toBe(false)
    // Yesterday's → missing.
    expect(isDailyFullMissing({ ...conn, last_full_catalog_success_at: "2026-11-12T22:10:00.000Z" }, now)).toBe(true)
  })

  it("is never flagged for dry-run/off, a disabled connection, or one created after the slot", () => {
    expect(isDailyFullMissing({ ...conn, catalog_mode: "dry_run", last_full_catalog_success_at: null }, now)).toBe(false)
    expect(isDailyFullMissing({ ...conn, enabled: false, last_full_catalog_success_at: null }, now)).toBe(false)
    expect(
      isDailyFullMissing({ ...conn, createdAt: "2026-11-13T23:00:00.000Z", last_full_catalog_success_at: null }, now),
    ).toBe(false)
  })
})

describe("liveRefusalTarget", () => {
  it("attributes a 400 on 'live' to the mode that was switched", () => {
    expect(liveRefusalTarget({ catalog_mode: "live" }, "x")).toBe("catalog")
    expect(liveRefusalTarget({ offers_mode: "live" }, "x")).toBe("offers")
    expect(liveRefusalTarget({ catalog_mode: "live", offers_mode: "live" }, "Katalogni jonli rejimga ...")).toBe("catalog")
    expect(liveRefusalTarget({ catalog_mode: "live", offers_mode: "live" }, "Narx va qoldiqni ...")).toBe("offers")
    expect(liveRefusalTarget({ catalog_mode: "dry_run" }, "x")).toBeNull()
  })
})

describe("category mapping helpers (A3)", () => {
  const map = (o: Partial<CategoryMap> = {}): CategoryMap => ({
    group_id: "g1",
    path: ["Аксессуары", "Чехлы"],
    menu_category_id: null,
    ignored: false,
    auto: true,
    product_count: 3,
    ...o,
  })

  it("formats the path, falling back to the group id", () => {
    expect(formatGroupPath(map())).toBe("Аксессуары › Чехлы")
    expect(formatGroupPath(map({ path: [] }))).toBe("g1")
  })

  it("maps rows to select values and back to PUT bodies", () => {
    expect(categoryChoice(map())).toBe(AUTO_CHOICE)
    expect(categoryChoice(map({ ignored: true, menu_category_id: "m1" }))).toBe(IGNORE_CHOICE)
    expect(categoryChoice(map({ menu_category_id: "m1" }))).toBe("m1")
    expect(choiceToBody(AUTO_CHOICE)).toEqual({ menu_category_id: null, ignored: false })
    expect(choiceToBody(IGNORE_CHOICE)).toEqual({ menu_category_id: null, ignored: true })
    expect(choiceToBody("m1")).toEqual({ menu_category_id: "m1", ignored: false })
  })

  it("applyChoice keeps path/count and sets auto only for the auto rule", () => {
    expect(applyChoice(map(), "m1")).toEqual(map({ menu_category_id: "m1", auto: false }))
    expect(applyChoice(map({ menu_category_id: "m1", auto: false }), AUTO_CHOICE)).toEqual(map())
  })

  it("normalises the categories response", () => {
    const maps = [map()]
    const menu = [{ _id: "m1", name_uz: "Chexollar", is_active: false, source: "1c" as const }]
    // The real B2 response: { maps, categories }.
    expect(normaliseCategoriesData({ maps, categories: menu })).toEqual({ maps, menu_categories: menu })
    expect(normaliseCategoriesData({ maps, menu_categories: menu })).toEqual({ maps, menu_categories: menu })
    expect(normaliseCategoriesData({ category_maps: maps, categories: menu })).toEqual({ maps, menu_categories: menu })
    expect(normaliseCategoriesData(maps)).toEqual({ maps, menu_categories: [] })
    expect(normaliseCategoriesData(null)).toEqual({ maps: [], menu_categories: [] })
  })
})
