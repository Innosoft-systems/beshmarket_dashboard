/**
 * Date-range and navigation helpers for order lists (admin /orders, restaurant
 * /restaurant/orders, courier history). Pure, so they can be unit-tested; the
 * business runs on Asia/Tashkent calendar days.
 */

import { isRangeInvalid, monthBounds, todayTashkent } from "@/lib/subscribers-period"

export type OrderPeriod =
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "calendar_month"
  | "range"

export const ORDER_PERIOD_OPTIONS: { value: "all" | OrderPeriod; label: string }[] = [
  { value: "all", label: "Barcha vaqt" },
  { value: "today", label: "Bugun" },
  { value: "yesterday", label: "Kecha" },
  { value: "week", label: "Hafta" },
  { value: "month", label: "Oy" },
  { value: "calendar_month", label: "Oy tanlash" },
  { value: "range", label: "Sana oralig'i" },
]

export interface OrderPeriodInput {
  period?: string
  /** YYYY-MM, used by calendar_month. */
  month?: string
  /** YYYY-MM-DD, used by range. */
  date_from?: string
  /** YYYY-MM-DD, used by range. */
  date_to?: string
}

export interface OrderDateRange {
  date_from?: string
  date_to?: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

const pad = (n: number) => String(n).padStart(2, "0")

/** "2026-11-09", -7 -> "2026-11-02" (pure calendar maths, no timezone). */
export function shiftDay(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + delta))
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

/**
 * Turn the list's period filter into backend `date_from`/`date_to` (YYYY-MM-DD).
 * Returns {} for "all", unknown periods and incomplete/invalid month or range input.
 * `today` is injectable for tests; defaults to the Tashkent calendar day.
 */
export function resolveOrderDateRange(
  { period, month, date_from, date_to }: OrderPeriodInput,
  today: string = todayTashkent(),
): OrderDateRange {
  switch (period) {
    case "today":
      return { date_from: today, date_to: today }
    case "yesterday": {
      const y = shiftDay(today, -1)
      return { date_from: y, date_to: y }
    }
    case "week":
      return { date_from: shiftDay(today, -7), date_to: today }
    case "month":
      return { date_from: shiftDay(today, -30), date_to: today }
    case "calendar_month": {
      if (!month || !MONTH_RE.test(month)) return {}
      const { from, to } = monthBounds(month)
      return { date_from: from, date_to: to }
    }
    case "range": {
      const from = date_from && DATE_RE.test(date_from) ? date_from : ""
      const to = date_to && DATE_RE.test(date_to) ? date_to : ""
      if (isRangeInvalid(from, to)) return {}
      return { ...(from && { date_from: from }), ...(to && { date_to: to }) }
    }
    default:
      return {}
  }
}

export type OrderPanelScope = "admin" | "restaurant"

/** Where an order detail page may send "Orqaga" back to, per panel. */
export const ORDER_BACK_PREFIXES: Record<OrderPanelScope, readonly string[]> = {
  admin: ["/orders", "/couriers/"],
  restaurant: ["/restaurant/orders"],
}

/**
 * Validate a `from` back-link. Accepts only same-app relative paths under the
 * list pages of the caller's panel, so `from=https://evil.com`, `//evil.com`,
 * `/\evil.com` or the other panel's pages fall back to `fallback`.
 * (`isSafeInternalUrl` is applied by the caller too; this adds the prefix
 * allow-list and rejects backslashes, which browsers treat as `/`.)
 */
export function resolveBackHref(
  from: string | null | undefined,
  fallback: string,
  scope: OrderPanelScope = "admin",
): string {
  const prefixes = ORDER_BACK_PREFIXES[scope]
  if (!from || !from.startsWith("/") || from.startsWith("//") || from.includes("\\")) return fallback
  const ok = prefixes.some((p) => {
    if (p.endsWith("/")) return from.startsWith(p) && from.length > p.length
    return from === p || from.startsWith(`${p}?`) || from.startsWith(`${p}/`)
  })
  return ok ? from : fallback
}

/** `?page=` value -> integer >= 1 ("1.5" -> 1, "abc"/"-3"/"" -> 1). */
export function parsePageParam(raw: string | undefined): number {
  const n = Math.floor(Number(raw))
  return Number.isFinite(n) && n >= 1 ? n : 1
}

/**
 * URL of the last page when the requested page is past the end (hand-edited
 * URL, or a stale back link after the data shrank); null when no redirect is
 * needed. Only `pageKey` changes; every other query param is kept.
 */
export function lastPageRedirect(
  pathname: string,
  params: Record<string, string | string[] | undefined>,
  pageKey: string,
  page: number,
  totalPages: number | undefined,
): string | null {
  if (!totalPages || totalPages < 1 || page <= totalPages) return null
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (key === pageKey || value === undefined) continue
    for (const v of Array.isArray(value) ? value : [value]) qs.append(key, v)
  }
  if (totalPages > 1) qs.set(pageKey, String(totalPages))
  const s = qs.toString()
  return s ? `${pathname}?${s}` : pathname
}
