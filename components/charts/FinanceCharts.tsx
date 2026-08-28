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
import { compactSom, dayLabel, monthLabel, som } from "@/lib/format"

/**
 * Categorical slots 1–4 of the validated palette. Adjacent pairs clear CVD
 * separation (worst ΔE 9.1) and the normal-vision floor (22.9); aqua and
 * yellow sit below 3:1 on a light surface, so every chart using them ships
 * beside the detail table that carries the same numbers as text.
 *
 * Bars are grouped, never stacked: separating stacked segments needs a 2px
 * surface gap, and Recharts can only fake one with a stroke around the mark.
 */
export const SERIES = {
  income: "#2a78d6",
  cost: "#eb6834",
  third: "#1baf7a",
  fourth: "#eda100",
} as const

const GRID = "#e7e6e3"
const AXIS_TEXT = "#6b6a66"


function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string; dataKey?: string }[]
  label?: string
  labelFormatter?: (value: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
      <p className="mb-1 text-xs font-medium text-foreground">
        {labelFormatter && label ? labelFormatter(label) : label}
      </p>
      {payload.map(entry => (
        <p key={entry.dataKey} className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}:{" "}
          <span className="font-medium text-foreground">{som(entry.value ?? 0)}</span>
        </p>
      ))}
    </div>
  )
}

export function ChartCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function Empty({ height = 220 }: { height?: number }) {
  return (
    <div
      className="flex items-center justify-center text-sm text-muted-foreground"
      style={{ height }}
    >
      Bu davrda ma&apos;lumot yo&apos;q
    </div>
  )
}

export interface PeriodRow {
  period: string
  gmv: number
  commission: number
  service_fee: number
  delivery_fee: number
  courier_payout: number
  discount: number
  platform_net: number
  restaurant_earnings: number
  orders: number
}

/** Money in versus money out, month by month. */
export function IncomeVsCostChart({ data }: { data: PeriodRow[] }) {
  const rows = data.map(row => ({
    period: row.period,
    kirim: row.commission + row.service_fee + row.delivery_fee,
    chiqim: row.courier_payout + row.discount,
  }))
  const empty = rows.every(row => row.kirim === 0 && row.chiqim === 0)

  return (
    <ChartCard
      title="Platforma kirimi va chiqimi"
      description="Oylik — komissiya + servis + yetkazish, kuryer to'lovi + chegirmaga qarshi"
    >
      {empty ? (
        <Empty />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barGap={2}>
            <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
            <XAxis dataKey="period" tickFormatter={monthLabel} tick={{ fontSize: 11, fill: AXIS_TEXT }} tickLine={false} axisLine={{ stroke: GRID }} />
            <YAxis tickFormatter={compactSom} tick={{ fontSize: 11, fill: AXIS_TEXT }} tickLine={false} axisLine={false} width={64} />
            <Tooltip content={<ChartTooltip labelFormatter={monthLabel} />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: AXIS_TEXT, paddingTop: 8 }} />
            <Bar dataKey="kirim" name="Kirim" fill={SERIES.income} radius={[4, 4, 0, 0]} maxBarSize={24} />
            <Bar dataKey="chiqim" name="Chiqim" fill={SERIES.cost} radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

/** Where the platform's income comes from. */
export function IncomeBreakdownChart({ data }: { data: PeriodRow[] }) {
  const empty = data.every(row => row.commission === 0 && row.service_fee === 0 && row.delivery_fee === 0)

  return (
    <ChartCard title="Kirim tarkibi" description="Oylik — daromad manbalari alohida">
      {empty ? (
        <Empty />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barGap={2}>
            <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
            <XAxis dataKey="period" tickFormatter={monthLabel} tick={{ fontSize: 11, fill: AXIS_TEXT }} tickLine={false} axisLine={{ stroke: GRID }} />
            <YAxis tickFormatter={compactSom} tick={{ fontSize: 11, fill: AXIS_TEXT }} tickLine={false} axisLine={false} width={64} />
            <Tooltip content={<ChartTooltip labelFormatter={monthLabel} />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: AXIS_TEXT, paddingTop: 8 }} />
            <Bar dataKey="commission" name="Komissiya" fill={SERIES.income} radius={[4, 4, 0, 0]} maxBarSize={20} />
            <Bar dataKey="service_fee" name="Servis haqi" fill={SERIES.cost} radius={[4, 4, 0, 0]} maxBarSize={20} />
            <Bar dataKey="delivery_fee" name="Yetkazish haqi" fill={SERIES.third} radius={[4, 4, 0, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

/** Daily turnover — one series, so the title carries the identity. */
export function DailyGmvChart({ data }: { data: PeriodRow[] }) {
  const empty = data.every(row => row.gmv === 0)

  return (
    <ChartCard title="Kunlik aylanma" description="Oxirgi 30 kun — mijozlar to'lagan summa">
      {empty ? (
        <Empty />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
            <XAxis dataKey="period" tickFormatter={dayLabel} tick={{ fontSize: 10, fill: AXIS_TEXT }} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" minTickGap={16} />
            <YAxis tickFormatter={compactSom} tick={{ fontSize: 11, fill: AXIS_TEXT }} tickLine={false} axisLine={false} width={64} />
            <Tooltip content={<ChartTooltip labelFormatter={dayLabel} />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
            <Bar dataKey="gmv" name="Aylanma" fill={SERIES.income} radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

export interface NamedRow {
  name: string
  gmv: number
  orders: number
  platform_net: number
  restaurant_earnings: number
}

/** Venues ranked by turnover. Horizontal because names are long. */
export function TopVenuesChart({ data }: { data: NamedRow[] }) {
  const rows = data.filter(row => row.gmv > 0)

  return (
    <ChartCard title="Eng ko'p aylanma qilgan joylar" description="Oxirgi 30 kun, yetkazilgan buyurtmalar">
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 34)}>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 56, left: 4, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeWidth={1} horizontal={false} />
            <XAxis type="number" tickFormatter={compactSom} tick={{ fontSize: 11, fill: AXIS_TEXT }} tickLine={false} axisLine={{ stroke: GRID }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: AXIS_TEXT }} tickLine={false} axisLine={false} width={130} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
            <Bar dataKey="gmv" name="Aylanma" radius={[0, 4, 4, 0]} maxBarSize={24}>
              {rows.map(row => (
                <Cell key={row.name} fill={SERIES.income} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

export interface PaymentRow {
  method: string
  gmv: number
  orders: number
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Naqd",
  payme: "Payme",
  click: "Click",
}

/**
 * Payment split as bars, not a pie: three slices are hard to compare by angle
 * and a bar puts them on a shared baseline.
 */
export function PaymentMethodChart({ data }: { data: PaymentRow[] }) {
  const rows = data.map(row => ({ ...row, label: PAYMENT_LABELS[row.method] ?? row.method }))
  const colors = [SERIES.income, SERIES.cost, SERIES.third, SERIES.fourth]

  return (
    <ChartCard title="To'lov usullari" description="Oxirgi 30 kun — aylanma bo'yicha">
      {rows.length === 0 ? (
        <Empty height={180} />
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 46)}>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 56, left: 4, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeWidth={1} horizontal={false} />
            <XAxis type="number" tickFormatter={compactSom} tick={{ fontSize: 11, fill: AXIS_TEXT }} tickLine={false} axisLine={{ stroke: GRID }} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: AXIS_TEXT }} tickLine={false} axisLine={false} width={70} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
            <Bar dataKey="gmv" name="Aylanma" radius={[0, 4, 4, 0]} maxBarSize={24}>
              {rows.map((row, index) => (
                <Cell key={row.method} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

export interface StatusRow {
  status: string
  orders: number
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Kutilmoqda",
  accepted: "Qabul qilindi",
  preparing: "Tayyorlanmoqda",
  ready: "Tayyor",
  assigned: "Kuryer tayinlandi",
  on_the_way_to_restaurant: "Restoranga ketmoqda",
  picked_up: "Olindi",
  on_way: "Yo'lda",
  arrived_at_customer: "Mijoz oldida",
  delivered: "Yetkazildi",
  rejected: "Rad etildi",
  cancelled: "Bekor qilindi",
}

export function StatusChart({ data }: { data: StatusRow[] }) {
  const rows = data
    .filter(row => row.orders > 0)
    .map(row => ({ ...row, label: STATUS_LABELS[row.status] ?? row.status }))

  return (
    <ChartCard title="Buyurtma holatlari" description="Oxirgi 30 kun — barcha buyurtmalar">
      {rows.length === 0 ? (
        <Empty height={180} />
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 30)}>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 40, left: 4, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeWidth={1} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: AXIS_TEXT }} tickLine={false} axisLine={{ stroke: GRID }} allowDecimals={false} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: AXIS_TEXT }} tickLine={false} axisLine={false} width={140} />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-sm">
                    <span className="font-medium text-foreground">{label}</span>:{" "}
                    {payload[0].value} ta
                  </div>
                ) : null
              }
            />
            <Bar dataKey="orders" name="Buyurtma" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {rows.map(row => (
                <Cell
                  key={row.status}
                  fill={
                    row.status === "delivered"
                      ? SERIES.third
                      : row.status === "cancelled" || row.status === "rejected"
                        ? SERIES.cost
                        : SERIES.income
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

/** Label, value, and an optional period-over-period change. */
export function StatTile({
  label,
  value,
  hint,
  growth,
  accent,
}: {
  label: string
  value: string
  hint?: string
  growth?: number
  accent?: keyof typeof SERIES
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        {accent && (
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: SERIES[accent] }}
          />
        )}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
        {growth !== undefined && growth !== 0 && (
          <span className={growth > 0 ? "text-emerald-600" : "text-orange-600"}>
            {growth > 0 ? "▲" : "▼"} {Math.abs(growth)}%
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  )
}
