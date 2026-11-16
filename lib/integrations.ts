/**
 * 1C integration: Uzbek labels and pure formatting helpers for the admin
 * connection page. No React, no fetch (tested in lib/integrations.test.ts).
 */
import type {
  CategoriesData,
  CategoryLevel,
  CategoryMap,
  CategoryMapBody,
  DiffOp,
  HiddenBySyncReason,
  IntegrationConnection,
  IntegrationMode,
  IntegrationProtocol,
  IntegrationRunSummary,
  RunDiffItem,
  RunItemError,
  RunKind,
} from "@/types/integration"

export const PROTOCOL_LABELS: Record<IntegrationProtocol, string> = {
  json: "JSON (1C o'zi yuboradi)",
  commerceml: "CommerceML (standart almashuv)",
}

export const MODE_LABELS: Record<IntegrationMode, string> = {
  off: "O'chiq",
  dry_run: "Sinov",
  live: "Jonli",
}

export const MODE_HINTS: Record<IntegrationMode, string> = {
  off: "1C ma'lumotlari qabul qilinmaydi",
  dry_run: "Qabul qilinadi va tekshiriladi, mahsulotlar o'zgarmaydi",
  live: "Mahsulotlar 1C bo'yicha yangilanadi",
}

export const CATEGORY_LEVEL_LABELS: Record<CategoryLevel, string> = {
  top: "Yuqori guruh",
  leaf: "Oxirgi guruh",
}

export const HIDDEN_REASON_LABELS: Record<HiddenBySyncReason, string> = {
  missing: "1C da yo'q",
  inactive_in_1c: "1C da nofaol",
  weighted: "Tarozi mahsuloti",
  no_price: "Narx yo'q",
  category_ignored: "Kategoriya import qilinmaydi",
  category_inactive: "Kategoriya hali faollashtirilmagan",
}

export const RUN_STATUS_LABELS: Record<IntegrationRunSummary["status"], string> = {
  receiving: "Qabul qilinmoqda",
  complete: "Tugadi",
  needs_review: "Tekshirish kerak",
  abandoned: "Tashlab ketilgan",
  superseded: "Yangisi bilan almashgan",
  failed: "Xatolik",
}

const TASHKENT = "Asia/Tashkent"

/** "14.11.2026 13:05" in Tashkent time; "—" when missing or unparsable. */
export function formatTashkentDateTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return "—"
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TASHKENT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(t))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("day")}.${get("month")}.${get("year")} ${get("hour")}:${get("minute")}`
}

/** "hozirgina" / "5 daqiqa oldin" / "3 soat oldin" / "2 kun oldin"; null when missing. */
export function formatAgo(iso: string | null | undefined, now: number = Date.now()): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  const minutes = Math.floor(Math.max(0, now - t) / 60_000)
  if (minutes < 1) return "hozirgina"
  if (minutes < 60) return `${minutes} daqiqa oldin`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} soat oldin`
  return `${Math.floor(hours / 24)} kun oldin`
}

/** Non-zero hidden-by-sync counts with labels, largest first. */
export function hiddenReasonRows(
  hidden: Partial<Record<HiddenBySyncReason, number>> | null | undefined,
): { reason: HiddenBySyncReason; label: string; count: number }[] {
  return (Object.entries(hidden ?? {}) as [HiddenBySyncReason, number][])
    .filter(([, count]) => typeof count === "number" && count > 0)
    .map(([reason, count]) => ({ reason, label: HIDDEN_REASON_LABELS[reason] ?? reason, count }))
    .sort((a, b) => b.count - a.count)
}

/** "3/5" batches of a run; "—" without a run. */
export function runProgress(run: IntegrationRunSummary | null | undefined): string {
  if (!run) return "—"
  return `${run.batches_done?.length ?? 0}/${run.batch_total ?? 0}`
}

// ---------------------------------------------------------------------------
// Run log (A2)

export const RUN_KIND_LABELS: Record<RunKind, string> = {
  catalog: "Katalog",
  offers: "Narx-qoldiq",
}

/**
 * Rev 2 (T30): delta requests are aggregated into hourly bucket runs. Older
 * or partial docs may lack `is_bucket`, so the bucket sync_id prefix counts too.
 */
export function isBucketRun(run: Pick<IntegrationRunSummary, "is_bucket" | "sync_id">): boolean {
  return run.is_bucket === true || (typeof run.sync_id === "string" && run.sync_id.startsWith("delta:"))
}

function tashkentHour(ms: number): number {
  const h = new Intl.DateTimeFormat("en-GB", { timeZone: TASHKENT, hour: "2-digit", hourCycle: "h23" }).format(new Date(ms))
  return Number(h)
}

const pad2 = (n: number) => String(n).padStart(2, "0")

/** When a run started: first batch, else creation. */
export function runStartedAt(run: IntegrationRunSummary): string | null {
  return run.first_batch_at ?? run.createdAt ?? null
}

/** "O'zgarishlar, 14:00–15:00" for an hourly bucket; "To'liq" for a full run. */
export function runLabel(run: IntegrationRunSummary): string {
  if (!isBucketRun(run)) return "To'liq"
  const started = Date.parse(runStartedAt(run) ?? "")
  if (Number.isNaN(started)) return "O'zgarishlar"
  const h = tashkentHour(started)
  return `O'zgarishlar, ${pad2(h)}:00–${pad2((h + 1) % 24)}:00`
}

/** Badge variant for a run status. */
export function runStatusVariant(status: IntegrationRunSummary["status"]): "destructive" | "secondary" | "outline" {
  if (status === "failed" || status === "needs_review") return "destructive"
  if (status === "receiving") return "outline"
  return "secondary"
}

/** Batches "n/total" only make sense for a full run; buckets have no batch order. */
export function runBatches(run: IntegrationRunSummary): string | null {
  return isBucketRun(run) ? null : runProgress(run)
}

/** "45 son", "2 daq 5 son", "1 soat 3 daq"; null when not measurable. */
export function runDuration(run: IntegrationRunSummary): string | null {
  const from = Date.parse(run.first_batch_at ?? "")
  const to = Date.parse(run.finished_at ?? run.last_batch_at ?? "")
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return null
  const s = Math.round((to - from) / 1000)
  if (s < 60) return `${s} son`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} daq ${s % 60} son`
  return `${Math.floor(m / 60)} soat ${m % 60} daq`
}

type CounterKey = keyof NonNullable<IntegrationRunSummary["counters"]>

const COUNTER_LABELS: [CounterKey, string][] = [
  ["created", "yangi"],
  ["updated", "yangilandi"],
  ["deactivated", "yashirildi"],
  ["reactivated", "qaytdi"],
  ["rejected", "xato"],
]

/** Non-zero headline counters, e.g. "12 yangi · 3 xato"; "o'zgarish yo'q" when all zero. */
export function runCountersSummary(run: IntegrationRunSummary): string {
  const c = run.counters ?? {}
  const parts = COUNTER_LABELS.filter(([k]) => (c[k] ?? 0) > 0).map(([k, label]) => `${c[k]} ${label}`)
  return parts.length ? parts.join(" · ") : "o'zgarish yo'q"
}

export const DIFF_OP_LABELS: Record<DiffOp, string> = {
  create: "Yangi",
  update: "O'zgaradi",
  deactivate: "Yashiriladi",
  reactivate: "Qaytadi",
  link: "Bog'lanadi",
}

const DIFF_ORDER: DiffOp[] = ["create", "update", "deactivate", "reactivate", "link"]

/** diff_sample grouped by op, in a fixed order, empty groups dropped. */
export function groupDiff(
  items: RunDiffItem[] | null | undefined,
): { op: DiffOp; label: string; items: RunDiffItem[] }[] {
  const list = items ?? []
  return DIFF_ORDER.map((op) => ({ op, label: DIFF_OP_LABELS[op], items: list.filter((i) => i.op === op) })).filter(
    (g) => g.items.length > 0,
  )
}

const CHANGE_FIELD_LABELS: Record<string, string> = {
  name: "Nomi",
  name_uz: "Nomi (uz)",
  name_ru: "Nomi (ru)",
  name_en: "Nomi (en)",
  price: "Narx",
  discount_price: "Chegirma narxi",
  is_active: "Faol",
  is_available: "Mavjud",
  stock: "Qoldiq",
  menu_category_id: "Kategoriya",
  images: "Rasmlar",
  description_uz: "Tavsif (uz)",
  description_ru: "Tavsif (ru)",
}

export function changeFieldLabel(field: string): string {
  return CHANGE_FIELD_LABELS[field] ?? field
}

/** Display a from/to value: numbers grouped, booleans in Uzbek, arrays by length. */
export function formatChangeValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—"
  if (typeof v === "boolean") return v ? "ha" : "yo'q"
  if (typeof v === "number") return v.toLocaleString("ru-RU")
  if (Array.isArray(v)) return `${v.length} ta`
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

/** Name and price first (the plan's "from → to for name and price"), then the rest alphabetically. */
export function orderedChanges(changes: RunDiffItem["changes"]): [string, { from: unknown; to: unknown }][] {
  const rank = (k: string) => (k.startsWith("name") ? 0 : k === "price" ? 1 : k === "discount_price" ? 2 : 3)
  return Object.entries(changes ?? {}).sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
}

/** Error codes in a run with counts, most frequent first. */
export function errorCodeCounts(errors: RunItemError[] | null | undefined): { code: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const e of errors ?? []) counts.set(e.code, (counts.get(e.code) ?? 0) + 1)
  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))
}

export const ERROR_CODE_LABELS: Record<string, string> = {
  MISSING_FIELD: "Majburiy maydon yo'q",
  INVALID_FIELD: "Noto'g'ri qiymat",
  DUPLICATE_IN_BATCH: "Paketda takror",
  UNKNOWN_PRODUCT: "Noma'lum mahsulot",
  CATEGORY_IGNORED: "Kategoriya import qilinmaydi",
  IMAGE_TOO_LARGE: "Rasm juda katta",
  IMAGE_BAD_TYPE: "Rasm turi noto'g'ri",
  IMAGE_MISSING_BODY: "Rasm fayli yo'q",
}

// ---------------------------------------------------------------------------
// Connection health (A1 rev 2 / rev 3)

/** Same constants as the backend's rev 3 rule (integrations-admin.service.ts). */
export const DAILY_FULL_GRACE_MINUTES = 180
export const DAILY_FULL_EARLY_MINUTES = 60
export const DEFAULT_DAILY_FULL_AT = "03:00"
export const DEFAULT_HEARTBEAT_WINDOW = { from: "08:00", to: "22:00" } as const

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/
const DAY_MS = 24 * 60 * 60_000
const TASHKENT_MS = 5 * 60 * 60_000

export function isHHMM(v: string): boolean {
  return HHMM_RE.test(v)
}

function hhmmToMinutes(v: string | null | undefined, fallback: number): number {
  const m = HHMM_RE.exec(v ?? "")
  return m ? Number(m[1]) * 60 + Number(m[2]) : fallback
}

/** "03:00" + 180 → "06:00"; wraps past midnight ("23:30" + 180 → "02:30"). */
export function addMinutesHHMM(v: string, minutes: number): string {
  const total = (((hhmmToMinutes(v, 0) + minutes) % 1440) + 1440) % 1440
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`
}

/**
 * The most recent daily-full slot whose deadline (`daily_full_at + 3 h`,
 * Tashkent) has passed at `now`. A port of the backend's `lastDailyFullSlot`.
 */
export function lastDailyFullSlot(dailyFullAt: string | null | undefined, now: number): { start: number; deadline: number } {
  const minutes = hhmmToMinutes(dailyFullAt, 3 * 60)
  const tashkentMidnight = Math.floor((now + TASHKENT_MS) / DAY_MS) * DAY_MS - TASHKENT_MS
  let start = tashkentMidnight + minutes * 60_000
  while (start + DAILY_FULL_GRACE_MINUTES * 60_000 > now) start -= DAY_MS
  return { start, deadline: start + DAILY_FULL_GRACE_MINUTES * 60_000 }
}

/**
 * Rev 3 "Bugun kelmadi": the last passed deadline had no full catalog that
 * started from `daily_full_at − 1 h`. The dashboard only sees
 * `last_full_catalog_success_at` (set by LIVE full runs), so the badge is shown
 * only while catalog is live; in other modes the backend's `stale` flag covers it.
 *
 * Known approximation (RV-2b D-6): that field is the run's FINISH time, while
 * the server rule uses the run's `first_batch_at`. A full that starts more than
 * 1 h before `daily_full_at` and finishes after that point counts here but not
 * on the server. The server's `stale` badge is shown next to it and stays the
 * authority; this badge only names the reason.
 */
export function isDailyFullMissing(
  c: Pick<IntegrationConnection, "enabled" | "catalog_mode" | "daily_full_at" | "last_full_catalog_success_at" | "createdAt">,
  now: number = Date.now(),
): boolean {
  if (!c.enabled || c.catalog_mode !== "live") return false
  const slot = lastDailyFullSlot(c.daily_full_at, now)
  const created = Date.parse(c.createdAt ?? "")
  if (!Number.isNaN(created) && created > slot.start) return false
  const last = Date.parse(c.last_full_catalog_success_at ?? "")
  return Number.isNaN(last) || last < slot.start - DAILY_FULL_EARLY_MINUTES * 60_000
}

/**
 * Which mode a 400 on PATCH refused `live` for, so the form can disable that
 * "Jonli" option: catalog until B5 (panel locks), offers until B6 (stock).
 * Only a refusal that talks about the live mode counts (both backend texts say
 * "jonli rejim"): any other 400 in the same save (e.g. a bad IP) is not one
 * (RV-2b D-1). When both modes were switched, the server text decides.
 */
export function liveRefusalTarget(
  patch: { catalog_mode?: IntegrationMode; offers_mode?: IntegrationMode },
  message: string,
): "catalog" | "offers" | null {
  if (!/jonli/i.test(message)) return null
  const catalog = patch.catalog_mode === "live"
  const offers = patch.offers_mode === "live"
  if (catalog && !offers) return "catalog"
  if (offers && !catalog) return "offers"
  if (catalog && offers) {
    if (/katalog/i.test(message)) return "catalog"
    if (/narx|qoldiq/i.test(message)) return "offers"
  }
  return null
}

// ---------------------------------------------------------------------------
// Category mapping (A3)

export const AUTO_CHOICE = "__auto__"
export const IGNORE_CHOICE = "__ignore__"

/** "Аксессуары › Чехлы"; the group id when the path is empty. */
export function formatGroupPath(map: Pick<CategoryMap, "path" | "group_id">): string {
  return map.path?.length ? map.path.join(" › ") : map.group_id
}

/** Select value of a row: a menu category id, AUTO_CHOICE or IGNORE_CHOICE. */
export function categoryChoice(map: Pick<CategoryMap, "ignored" | "menu_category_id">): string {
  if (map.ignored) return IGNORE_CHOICE
  return map.menu_category_id ?? AUTO_CHOICE
}

/** PUT body for a select value. */
export function choiceToBody(choice: string): CategoryMapBody {
  if (choice === IGNORE_CHOICE) return { menu_category_id: null, ignored: true }
  if (choice === AUTO_CHOICE) return { menu_category_id: null, ignored: false }
  return { menu_category_id: choice, ignored: false }
}

/** Apply a choice locally (optimistic update); `auto` stays true only for the auto rule. */
export function applyChoice(map: CategoryMap, choice: string): CategoryMap {
  return { ...map, ...choiceToBody(choice), auto: choice === AUTO_CHOICE }
}

/**
 * GET …/categories returns `{ maps, categories }` (B2). Also accepts
 * `menu_categories` / `category_maps` or a bare array of maps, and always
 * returns both lists.
 */
export function normaliseCategoriesData(raw: unknown): CategoriesData {
  if (Array.isArray(raw)) return { maps: raw as CategoryMap[], menu_categories: [] }
  const r = (raw ?? {}) as Record<string, unknown>
  const maps = r.maps ?? r.category_maps ?? r.items ?? []
  const menu = r.menu_categories ?? r.categories ?? []
  return {
    maps: Array.isArray(maps) ? (maps as CategoryMap[]) : [],
    menu_categories: Array.isArray(menu) ? (menu as CategoriesData["menu_categories"]) : [],
  }
}
