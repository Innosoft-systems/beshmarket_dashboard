/**
 * Number and date formatters shared by server and client.
 *
 * Deliberately outside any `"use client"` module: an export from a client
 * module becomes a client reference, and a Server Component that calls it
 * crashes with "Attempted to call som() from the server". Charts are client
 * components and pages are server components, so anything both use lives here.
 */

const MONTHS = [
  "Yan", "Fev", "Mar", "Apr", "May", "Iyn",
  "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek",
];

/** Whole so'm with thin-space grouping, e.g. "1 250 000 so'm". */
export function som(value: number): string {
  return `${Math.round(Number(value) || 0).toLocaleString("uz-UZ")} so'm`;
}

/** Short enough to sit under a bar: "1,2 mln", "450 ming". */
export function compactSom(value: number): string {
  const amount = Number(value) || 0;
  const size = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";
  if (size >= 1_000_000) {
    return `${sign}${(size / 1_000_000).toLocaleString("uz-UZ", { maximumFractionDigits: 1 })} mln`;
  }
  if (size >= 1_000) {
    return `${sign}${Math.round(size / 1_000).toLocaleString("uz-UZ")} ming`;
  }
  return `${sign}${Math.round(size)}`;
}

/** "2026-08" -> "Avg 26" */
export function monthLabel(key: string): string {
  const [year, month] = String(key).split("-");
  return `${MONTHS[Number(month) - 1] ?? month} ${String(year).slice(2)}`;
}

/** "2026-08-28" -> "28.08" */
export function dayLabel(key: string): string {
  const [, month, day] = String(key).split("-");
  return `${day}.${month}`;
}

// Built by hand instead of toLocaleString("uz"): Node and Chrome ship
// different Uzbek locale data ("26-okt" vs "M10"), which garbles the date
// and breaks hydration. Tashkent is UTC+5 with no DST.
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

function tashkentParts(value: string) {
  const d = new Date(new Date(value).getTime() + TASHKENT_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    day: pad(d.getUTCDate()),
    month: d.getUTCMonth(),
    year: d.getUTCFullYear(),
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  };
}

/** "26.10.2026" */
export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const p = tashkentParts(value);
  return `${p.day}.${String(p.month + 1).padStart(2, "0")}.${p.year}`;
}

/** "26 Okt 2026, 19:56" */
export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const p = tashkentParts(value);
  return `${p.day} ${MONTHS[p.month]} ${p.year}, ${p.time}`;
}
