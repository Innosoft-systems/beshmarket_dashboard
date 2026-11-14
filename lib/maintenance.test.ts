import {
  buildEnableBody,
  changeReason,
  defaultPauseForm,
  describeHistoryEntry,
  describePause,
  formatCountdown,
  formatDurationLabel,
  formatResumeTime,
  isPauseActive,
  mergeMaintenance,
  parseMaintenanceState,
  remainingMs,
  type PauseFormState,
} from "./maintenance"

const NOW = Date.parse("2026-11-13T07:30:00.000Z") // Friday 12:30 in Tashkent

describe("maintenance: active / countdown", () => {
  it("is inactive when the flag is off or missing", () => {
    expect(isPauseActive(null, NOW)).toBe(false)
    expect(isPauseActive({ active: false, reason: null, until: null, message: null }, NOW)).toBe(false)
  })

  it("expires on the client at `until` (the until instant itself is open)", () => {
    const s = { active: true, reason: "friday" as const, until: "2026-11-13T08:30:00.000Z", message: null }
    const until = Date.parse(s.until)
    expect(isPauseActive(s, until - 1)).toBe(true)
    expect(isPauseActive(s, until)).toBe(false)
    expect(isPauseActive(s, until + 1)).toBe(false)
  })

  it("an indefinite pause stays active", () => {
    expect(isPauseActive({ active: true, reason: "technical", until: null, message: null }, NOW)).toBe(true)
  })

  it("computes the remaining time, never negative", () => {
    expect(remainingMs("2026-11-13T08:30:00.000Z", NOW)).toBe(3_600_000)
    expect(remainingMs("2026-11-13T07:00:00.000Z", NOW)).toBe(0)
    expect(remainingMs(null, NOW)).toBeNull()
    expect(remainingMs("garbage", NOW)).toBeNull()
  })

  it("formats the countdown as m:ss / h:mm:ss, rounding up", () => {
    expect(formatCountdown(2_729_000)).toBe("45:29")
    expect(formatCountdown(5_399_000)).toBe("1:29:59")
    expect(formatCountdown(3_600_000)).toBe("1:00:00")
    expect(formatCountdown(59_001)).toBe("1:00")
    expect(formatCountdown(500)).toBe("0:01")
    expect(formatCountdown(0)).toBe("0:00")
    expect(formatCountdown(-5)).toBe("0:00")
  })
})

describe("maintenance: Tashkent formatting", () => {
  it("shows HH:mm for the same Tashkent day", () => {
    expect(formatResumeTime("2026-11-13T08:30:00.000Z", NOW)).toBe("13:30")
  })

  it("adds DD.MM when the resume time is on another Tashkent day", () => {
    // 19:30Z = 00:30 next day in Tashkent
    expect(formatResumeTime("2026-11-13T19:30:00.000Z", NOW)).toBe("14.11 00:30")
  })

  it("uses the Tashkent day, not UTC, for 'today'", () => {
    const lateUtc = Date.parse("2026-11-12T20:00:00.000Z") // already 01:00 on the 13th in Tashkent
    expect(formatResumeTime("2026-11-12T21:00:00.000Z", lateUtc)).toBe("02:00")
  })

  it("labels durations in Uzbek", () => {
    expect(formatDurationLabel(30)).toBe("30 daqiqa")
    expect(formatDurationLabel(60)).toBe("1 soat")
    expect(formatDurationLabel(90)).toBe("1,5 soat")
    expect(formatDurationLabel(120)).toBe("2 soat")
    expect(formatDurationLabel(75)).toBe("1 soat 15 daqiqa")
  })
})

describe("maintenance: pause form", () => {
  it("defaults to 1 hour, Juma namozi on a Tashkent Friday, Texnik otherwise", () => {
    expect(defaultPauseForm(NOW)).toEqual({ reason: "friday", duration: { kind: "preset", minutes: 60 }, message: "" })
    const thursday = Date.parse("2026-11-12T07:30:00.000Z")
    expect(defaultPauseForm(thursday).reason).toBe("technical")
    // 20:00Z Thursday = 01:00 Friday in Tashkent
    expect(defaultPauseForm(Date.parse("2026-11-12T20:00:00.000Z")).reason).toBe("friday")
  })

  it("keeps a preset that the new reason also offers, otherwise falls back to 1 hour", () => {
    const f: PauseFormState = { reason: "friday", duration: { kind: "preset", minutes: 90 }, message: "x" }
    expect(changeReason(f, "weather").duration).toEqual({ kind: "preset", minutes: 60 })
    const f60: PauseFormState = { ...f, duration: { kind: "preset", minutes: 60 } }
    expect(changeReason(f60, "technical").duration).toEqual({ kind: "preset", minutes: 60 })
    expect(changeReason(f60, "custom").duration).toEqual({ kind: "custom", minutes: "60" })
    const indef: PauseFormState = { ...f, duration: { kind: "indefinite" } }
    expect(changeReason(indef, "weather").duration).toEqual({ kind: "indefinite" })
    expect(changeReason(f, "weather").message).toBe("x")
  })

  it("builds a body with exactly one duration field", () => {
    expect(buildEnableBody({ reason: "friday", duration: { kind: "preset", minutes: 90 }, message: "" }))
      .toEqual({ ok: true, minutes: 90, body: { reason: "friday", duration_minutes: 90 } })
    expect(buildEnableBody({ reason: "technical", duration: { kind: "indefinite" }, message: "" }))
      .toEqual({ ok: true, minutes: null, body: { reason: "technical", indefinite: true } })
    expect(buildEnableBody({ reason: "custom", duration: { kind: "custom", minutes: " 45 " }, message: "" }))
      .toEqual({ ok: true, minutes: 45, body: { reason: "custom", duration_minutes: 45 } })
  })

  it("sends a trimmed custom message as uz only", () => {
    const r = buildEnableBody({ reason: "weather", duration: { kind: "preset", minutes: 60 }, message: "  Qor yog'moqda  " })
    expect(r).toEqual({ ok: true, minutes: 60, body: { reason: "weather", duration_minutes: 60, message: { uz: "Qor yog'moqda" } } })
  })

  it("rejects bad custom minutes and over-long messages", () => {
    const base: PauseFormState = { reason: "custom", duration: { kind: "custom", minutes: "" }, message: "" }
    for (const minutes of ["", "abc", "1.5", "-5"]) {
      expect(buildEnableBody({ ...base, duration: { kind: "custom", minutes } }).ok).toBe(false)
    }
    expect(buildEnableBody({ ...base, duration: { kind: "custom", minutes: "0" } }).ok).toBe(false)
    expect(buildEnableBody({ ...base, duration: { kind: "custom", minutes: "1441" } }).ok).toBe(false)
    expect(buildEnableBody({ ...base, duration: { kind: "custom", minutes: "1440" } }).ok).toBe(true)
    expect(buildEnableBody({ ...base, duration: { kind: "custom", minutes: "1" } }).ok).toBe(true)
    const long = buildEnableBody({ ...base, duration: { kind: "custom", minutes: "60" }, message: "a".repeat(301) })
    expect(long).toEqual({ ok: false, error: "Xabar 300 belgidan oshmasligi kerak" })
    expect(buildEnableBody({ ...base, duration: { kind: "custom", minutes: "60" }, message: "a".repeat(300) }).ok).toBe(true)
  })

  it("describes the pause for the confirm step", () => {
    const f: PauseFormState = { reason: "friday", duration: { kind: "preset", minutes: 60 }, message: "" }
    expect(describePause(f, 60, NOW)).toBe("Juma namozi, 1 soat: soat 13:30 gacha (Toshkent vaqti)")
    expect(describePause({ ...f, reason: "technical" }, null, NOW)).toBe("Texnik ishlar, muddatsiz (o'zingiz o'chirguningizcha)")
  })
})

describe("maintenance: history and merge", () => {
  it("describes the last audit entry", () => {
    expect(describeHistoryEntry({ action: "enable", at: "", by: { id: "u1", name: "aziz" } })).toBe("aziz yoqdi")
    expect(describeHistoryEntry({ action: "extend", at: "", by: { id: "u1" } })).toBe("Admin uzaytirdi")
    expect(describeHistoryEntry({ action: "expire", at: "", by: { id: null } })).toBe("muddati tugadi")
    expect(describeHistoryEntry(undefined)).toBeNull()
  })

  it("validates socket payloads", () => {
    expect(parseMaintenanceState(null)).toBeNull()
    expect(parseMaintenanceState("x")).toBeNull()
    expect(parseMaintenanceState({ reason: "friday" })).toBeNull()
    expect(parseMaintenanceState({ active: false, reason: "friday", until: "2026-11-13T08:30:00.000Z" }))
      .toEqual({ active: false, reason: null, until: null, message: null })
    const msg = { uz: "a", ru: "b", en: "c" }
    expect(parseMaintenanceState({ active: true, reason: "weather", until: "2026-11-13T08:30:00.000Z", message: msg }))
      .toEqual({ active: true, reason: "weather", until: "2026-11-13T08:30:00.000Z", message: msg })
    expect(parseMaintenanceState({ active: true, reason: "bogus", until: "nope", message: { uz: "a" } }))
      .toEqual({ active: true, reason: null, until: null, message: null })
  })

  it("merges a socket payload and keeps the known history", () => {
    const prev = {
      active: false, reason: null, until: null, message: null, mode: false,
      history: [{ action: "disable" as const, at: "x", by: { id: "u1" } }],
    }
    const merged = mergeMaintenance(prev, { active: true, reason: "weather", until: "2026-11-13T09:00:00.000Z", message: null })
    expect(merged).toMatchObject({ active: true, reason: "weather", mode: true, history: prev.history })
    expect(mergeMaintenance(null, { active: false, reason: null, until: null, message: null }).history).toEqual([])
  })
})
