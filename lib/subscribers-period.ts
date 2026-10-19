/**
 * Period maths for the subscribers page. Pure and timezone-aware so it can be
 * tested without rendering: the business runs on Asia/Tashkent calendar days.
 */

export type PeriodMode = "week" | "current" | "previous" | "month" | "range"

export interface Period {
  from: string
  to: string
}

const pad = (n: number) => String(n).padStart(2, "0")

/** Today's calendar date in Tashkent, as YYYY-MM-DD. */
export function todayTashkent(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(new Date())
}

/** First and last day of a "YYYY-MM" month. */
export function monthBounds(ym: string): Period {
  const [y, m] = ym.split("-").map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}` }
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}

/** "2026-10-01", "2026-10-31" -> "01.10.2026 – 31.10.2026" */
export function formatRange(from: string, to: string): string {
  const f = (v: string) => v.split("-").reverse().join(".")
  return `${f(from)} – ${f(to)}`
}

/** True when both dates are set and the range runs backwards. */
export function isRangeInvalid(from: string, to: string): boolean {
  return !!from && !!to && from > to
}

/** The 7 calendar days ending today (Tashkent), inclusive. */
export function lastSevenDays(): Period {
  const today = todayTashkent()
  const [y, m, d] = today.split("-").map(Number)
  const start = new Date(Date.UTC(y, m - 1, d - 6))
  return {
    from: `${start.getUTCFullYear()}-${pad(start.getUTCMonth() + 1)}-${pad(start.getUTCDate())}`,
    to: today,
  }
}

/** Resolve the selected mode to a concrete period, or null while incomplete/invalid. */
export function resolvePeriod(
  mode: PeriodMode,
  month: string,
  rangeFrom: string,
  rangeTo: string,
): Period | null {
  const thisMonth = todayTashkent().slice(0, 7)
  if (mode === "week") return lastSevenDays()
  if (mode === "current") return monthBounds(thisMonth)
  if (mode === "previous") return monthBounds(shiftMonth(thisMonth, -1))
  if (mode === "month") return month ? monthBounds(month) : null
  if (!rangeFrom || !rangeTo || rangeFrom > rangeTo) return null
  return { from: rangeFrom, to: rangeTo }
}
