/**
 * 1C integration: Uzbek labels and pure formatting helpers for the admin
 * connection page. No React, no fetch (tested in lib/integrations.test.ts).
 */
import type {
  CategoryLevel,
  HiddenBySyncReason,
  IntegrationMode,
  IntegrationProtocol,
  IntegrationRunSummary,
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
