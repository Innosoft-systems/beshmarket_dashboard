/**
 * Platform pause ("Profilaktik ishlar"): types, presets and pure helpers for
 * the admin header control. Contract: .agents/reports/pause-backend.md.
 * Pure (no React, no fetch) so the countdown, formatting and form rules are
 * unit-tested in lib/maintenance.test.ts.
 */

export type MaintenanceReason = "friday" | "weather" | "technical" | "custom"

export interface MaintenanceMessage {
  uz: string
  ru: string
  en: string
}

/** Public shape: /settings/app `maintenance` and the `platform.maintenance` socket payload. */
export interface MaintenanceState {
  active: boolean
  reason: MaintenanceReason | null
  /** ISO 8601 UTC; null while active = until an admin turns it off. */
  until: string | null
  message: MaintenanceMessage | null
}

export type MaintenanceHistoryAction = "enable" | "extend" | "disable" | "expire"

export interface MaintenanceHistoryEntry {
  action: MaintenanceHistoryAction
  at: string
  by: { id: string | null; role?: string; name?: string }
  reason?: MaintenanceReason | null
  until?: string | null
}

/** Admin view returned by GET/POST/DELETE /settings/maintenance and POST /extend. */
export interface MaintenanceAdminView extends MaintenanceState {
  mode: boolean
  history: MaintenanceHistoryEntry[]
}

export interface EnableMaintenanceBody {
  reason: MaintenanceReason
  duration_minutes?: number
  indefinite?: true
  message?: { uz: string }
}

export const INACTIVE_MAINTENANCE: MaintenanceState = {
  active: false,
  reason: null,
  until: null,
  message: null,
}

/** Backend limits (MAINTENANCE_MAX_MINUTES, message length). */
export const MAX_PAUSE_MINUTES = 1440
export const MAX_MESSAGE_LENGTH = 300
export const EXTEND_MINUTES = 30
/** The plan: "UI defaults to 1 h". */
export const DEFAULT_PAUSE_MINUTES = 60

export interface ReasonOption {
  value: MaintenanceReason
  label: string
  /** Duration presets in minutes, shown as quick buttons. */
  presets: number[]
  /** uz default text the backend uses when no custom message is sent. */
  defaultMessage: string
}

export const REASON_OPTIONS: ReasonOption[] = [
  {
    value: "friday",
    label: "Juma namozi",
    presets: [60, 90],
    defaultMessage: "Juma namozi sababli buyurtmalar vaqtincha qabul qilinmayapti.",
  },
  {
    value: "weather",
    label: "Ob-havo",
    presets: [60, 120],
    defaultMessage: "Noqulay ob-havo sababli buyurtmalar vaqtincha qabul qilinmayapti.",
  },
  {
    value: "technical",
    label: "Texnik ishlar",
    presets: [30, 60],
    defaultMessage: "Profilaktik ishlar olib borilmoqda. Buyurtmalar vaqtincha qabul qilinmayapti.",
  },
  {
    value: "custom",
    label: "Boshqa sabab",
    presets: [],
    defaultMessage: "Profilaktik ishlar olib borilmoqda. Buyurtmalar vaqtincha qabul qilinmayapti.",
  },
]

export function reasonOption(reason: MaintenanceReason | null | undefined): ReasonOption | undefined {
  return REASON_OPTIONS.find((r) => r.value === reason)
}

export function reasonLabel(reason: MaintenanceReason | null | undefined): string {
  return reasonOption(reason)?.label ?? "Pauza"
}

/** 30 -> "30 daqiqa", 60 -> "1 soat", 90 -> "1,5 soat", 75 -> "1 soat 15 daqiqa". */
export function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} daqiqa`
  if (minutes % 60 === 0) return `${minutes / 60} soat`
  if (minutes % 30 === 0) return `${String(minutes / 60).replace(".", ",")} soat`
  return `${Math.floor(minutes / 60)} soat ${minutes % 60} daqiqa`
}

/**
 * Client-side read of `active`: the backend computes it when read, and its
 * expiry socket event comes from a once-a-minute cron, so the panel hides the
 * banner itself at `until` (the `until` instant is no longer paused).
 */
export function isPauseActive(state: MaintenanceState | null | undefined, now: number = Date.now()): boolean {
  if (!state?.active) return false
  if (!state.until) return true
  const t = Date.parse(state.until)
  return Number.isNaN(t) ? true : now < t
}

/** Milliseconds left until `until` (never negative); null for an indefinite pause. */
export function remainingMs(until: string | null | undefined, now: number = Date.now()): number | null {
  if (!until) return null
  const t = Date.parse(until)
  if (Number.isNaN(t)) return null
  return Math.max(0, t - now)
}

/** 2_729_000 -> "45:29", 5_399_000 -> "1:29:59". Rounds up, so "0:00" only at the end. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

const TASHKENT = "Asia/Tashkent"

function tashkentParts(ms: number) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TASHKENT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour"), mi: get("minute") }
}

/**
 * Resume time in Tashkent, like the backend's 409 text: "13:30", or
 * "14.11 13:30" when it falls on another Tashkent calendar day than `now`.
 */
export function formatResumeTime(until: string | number, now: number = Date.now()): string {
  const t = typeof until === "number" ? until : Date.parse(until)
  const a = tashkentParts(t)
  const b = tashkentParts(now)
  const time = `${a.h}:${a.mi}`
  return a.y === b.y && a.mo === b.mo && a.d === b.d ? time : `${a.d}.${a.mo} ${time}`
}

/** Pause form in the header modal. */
export type DurationChoice =
  | { kind: "preset"; minutes: number }
  | { kind: "custom"; minutes: string }
  | { kind: "indefinite" }

export interface PauseFormState {
  reason: MaintenanceReason
  duration: DurationChoice
  message: string
}

/** Default form: 1 hour; Friday in Tashkent suggests "Juma namozi", otherwise "Texnik ishlar". */
export function defaultPauseForm(now: number = Date.now()): PauseFormState {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: TASHKENT, weekday: "short" }).format(new Date(now))
  return {
    reason: weekday === "Fri" ? "friday" : "technical",
    duration: { kind: "preset", minutes: DEFAULT_PAUSE_MINUTES },
    message: "",
  }
}

/** Switching reason keeps a still-valid preset, otherwise falls back to 1 h (custom minutes for "Boshqa"). */
export function changeReason(form: PauseFormState, reason: MaintenanceReason): PauseFormState {
  const opt = reasonOption(reason)
  let duration = form.duration
  if (duration.kind === "preset" && !opt?.presets.includes(duration.minutes)) {
    duration = opt?.presets.includes(DEFAULT_PAUSE_MINUTES)
      ? { kind: "preset", minutes: DEFAULT_PAUSE_MINUTES }
      : { kind: "custom", minutes: String(DEFAULT_PAUSE_MINUTES) }
  }
  return { ...form, reason, duration }
}

export type BuildResult =
  | { ok: true; body: EnableMaintenanceBody; minutes: number | null }
  | { ok: false; error: string }

/** Validate the form and build the POST /settings/maintenance body (exactly one duration field). */
export function buildEnableBody(form: PauseFormState): BuildResult {
  let minutes: number | null
  if (form.duration.kind === "indefinite") {
    minutes = null
  } else if (form.duration.kind === "preset") {
    minutes = form.duration.minutes
  } else {
    const raw = form.duration.minutes.trim()
    if (!/^\d+$/.test(raw)) return { ok: false, error: "Daqiqani butun son bilan kiriting" }
    minutes = Number(raw)
  }
  if (minutes !== null && (minutes < 1 || minutes > MAX_PAUSE_MINUTES)) {
    return { ok: false, error: `Muddat 1 dan ${MAX_PAUSE_MINUTES} daqiqagacha bo'lishi kerak (24 soat)` }
  }

  const message = form.message.trim()
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Xabar ${MAX_MESSAGE_LENGTH} belgidan oshmasligi kerak` }
  }

  const body: EnableMaintenanceBody = {
    reason: form.reason,
    ...(minutes === null ? { indefinite: true as const } : { duration_minutes: minutes }),
    // Only uz is typed here; the backend fills ru/en with the reason's default text.
    ...(message && { message: { uz: message } }),
  }
  return { ok: true, body, minutes }
}

/** One-line summary for the confirm step. */
export function describePause(form: PauseFormState, minutes: number | null, now: number = Date.now()): string {
  const reason = reasonLabel(form.reason)
  if (minutes === null) return `${reason}, muddatsiz (o'zingiz o'chirguningizcha)`
  return `${reason}, ${formatDurationLabel(minutes)}: soat ${formatResumeTime(now + minutes * 60_000, now)} gacha (Toshkent vaqti)`
}

const HISTORY_ACTIONS: Record<MaintenanceHistoryAction, string> = {
  enable: "yoqdi",
  extend: "uzaytirdi",
  disable: "o'chirdi",
  expire: "muddati tugadi",
}

/** "admin1 yoqdi" / "muddati tugadi" for the most recent audit entry. */
export function describeHistoryEntry(entry: MaintenanceHistoryEntry | undefined): string | null {
  if (!entry) return null
  const action = HISTORY_ACTIONS[entry.action] ?? entry.action
  if (entry.action === "expire" || !entry.by?.id) return action
  return `${entry.by.name || "Admin"} ${action}`
}

const REASONS: readonly string[] = ["friday", "weather", "technical", "custom"]

/** Validate an untrusted socket payload; null when it is not a `maintenance` object. */
export function parseMaintenanceState(payload: unknown): MaintenanceState | null {
  if (!payload || typeof payload !== "object") return null
  const p = payload as Record<string, unknown>
  if (typeof p.active !== "boolean") return null
  if (!p.active) return INACTIVE_MAINTENANCE
  const reason = typeof p.reason === "string" && REASONS.includes(p.reason) ? (p.reason as MaintenanceReason) : null
  const until = typeof p.until === "string" && !Number.isNaN(Date.parse(p.until)) ? p.until : null
  const m = p.message as Record<string, unknown> | null | undefined
  const message =
    m && typeof m.uz === "string" && typeof m.ru === "string" && typeof m.en === "string"
      ? { uz: m.uz, ru: m.ru, en: m.en }
      : null
  return { active: true, reason, until, message }
}

/** Merge a socket/public `maintenance` payload into the admin view (keeps history until refetched). */
export function mergeMaintenance(
  prev: MaintenanceAdminView | null,
  next: MaintenanceState,
): MaintenanceAdminView {
  return {
    mode: next.active,
    history: prev?.history ?? [],
    ...next,
  }
}
