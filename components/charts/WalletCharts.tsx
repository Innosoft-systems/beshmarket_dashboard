"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

/**
 * Chart palette.
 *
 * Categorical slots 1 and 2 of the validated default palette. The pair clears
 * the lightness band, chroma floor, CVD separation (ΔE 24.7 protan), the
 * normal-vision floor (33.6) and 3:1 contrast on a light surface. The dashboard
 * ships light only, so no dark steps are defined; add them from the same ramps
 * if a theme toggle ever lands, rather than flipping these.
 */
const SERIES_CREDIT = "#2a78d6"
const SERIES_DEBIT = "#eb6834"
/** One step off the surface — gridlines carry no data, so they stay recessive. */
const GRID = "#e7e6e3"
const AXIS_TEXT = "#6b6a66"

const MONTH_NAMES = [
  "Yan", "Fev", "Mar", "Apr", "May", "Iyn",
  "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek",
]

export interface WalletChartPoint {
  month: string
  credit: number
  debit: number
}

const som = (value: number) => `${Math.round(value || 0).toLocaleString("uz-UZ")} so'm`

/** Axis ticks stay short — "1,2 mln" beats a nine-digit number under a bar. */
function compactSom(value: number) {
  const n = Math.abs(value)
  if (n >= 1_000_000) return `${(value / 1_000_000).toLocaleString("uz-UZ", { maximumFractionDigits: 1 })} mln`
  if (n >= 1_000) return `${Math.round(value / 1_000).toLocaleString("uz-UZ")} ming`
  return String(Math.round(value))
}

function monthLabel(key: string) {
  const [year, month] = key.split("-")
  const index = Number(month) - 1
  return `${MONTH_NAMES[index] ?? month} ${String(year).slice(2)}`
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string; dataKey?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
      <p className="mb-1 text-xs font-medium text-foreground">{label}</p>
      {payload.map(entry => (
        <p key={entry.dataKey} className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: <span className="font-medium text-foreground">{som(entry.value ?? 0)}</span>
        </p>
      ))}
    </div>
  )
}

/**
 * Money in vs money out, by month.
 *
 * Both series are plotted as positive magnitudes on one axis — debits are
 * stored signed, and mixing a negative series onto the same scale would make
 * the two bars point in opposite directions for the same question.
 */
export function WalletMovementChart({
  data,
  title = "Oylik harakat",
  description,
}: {
  data: WalletChartPoint[]
  title?: string
  description?: string
}) {
  const empty = data.every(point => point.credit === 0 && point.debit === 0)

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">
          {description ?? "Oxirgi 6 oy — kirim va chiqim"}
        </p>
      </div>

      {empty ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
          Bu davrda balans harakati bo'lmagan
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          {/* barGap 2 is the surface gap: neighbours read apart because of the
              air between them, not a stroke drawn around them. */}
          <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barGap={2}>
            <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={monthLabel}
              tick={{ fontSize: 11, fill: AXIS_TEXT }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
            />
            <YAxis
              tickFormatter={compactSom}
              tick={{ fontSize: 11, fill: AXIS_TEXT }}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              labelFormatter={monthLabel}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: AXIS_TEXT, paddingTop: 8 }}
            />
            <Bar dataKey="credit" name="Kirim" fill={SERIES_CREDIT} radius={[4, 4, 0, 0]} maxBarSize={24} />
            <Bar dataKey="debit" name="Chiqim" fill={SERIES_DEBIT} radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export interface RestaurantBalance {
  _id: string
  name: string
  balance: number
  reserved_balance: number
}

/**
 * Balance held per venue.
 *
 * One series, so no legend — the title already says what is plotted. Horizontal
 * bars because venue names are long enough to collide as column labels.
 */
export function RestaurantBalancesChart({
  data,
  limit = 10,
}: {
  data: RestaurantBalance[]
  limit?: number
}) {
  const rows = data.filter(item => item.balance > 0).slice(0, limit)

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Restoranlar balansi</h3>
        <p className="text-xs text-muted-foreground">
          {rows.length > 0
            ? `Balansi bor ${rows.length} ta joy, kattadan kichikka`
            : "Balansi bor joy yo'q"}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
          Hozircha hech bir restoranda balans yo'q
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 34)}>
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 56, left: 4, bottom: 0 }}
          >
            <CartesianGrid stroke={GRID} strokeWidth={1} horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={compactSom}
              tick={{ fontSize: 11, fill: AXIS_TEXT }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: AXIS_TEXT }}
              tickLine={false}
              axisLine={false}
              width={120}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
            <Bar dataKey="balance" name="Balans" radius={[0, 4, 4, 0]} maxBarSize={24}>
              {rows.map(row => (
                <Cell key={row._id} fill={SERIES_CREDIT} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

/** Label + value. A single number does not need a plot. */
export function BalanceTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: number
  hint?: string
  accent?: "credit" | "debit"
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        {accent && (
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: accent === "credit" ? SERIES_CREDIT : SERIES_DEBIT }}
          />
        )}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{som(value)}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
