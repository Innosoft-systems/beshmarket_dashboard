"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { ChartCard, SERIES } from "@/components/charts/FinanceCharts"
import { compactSom, dayLabel, monthLabel, som } from "@/lib/format"
import {
  formatRange,
  isRangeInvalid,
  resolvePeriod,
  todayTashkent,
  type PeriodMode,
} from "@/lib/subscribers-period"
import {
  getSubscriberStatsAction,
  type SubscriberStats,
} from "@/lib/actions/subscribers"

const GRID = "#e7e6e3"
const AXIS_TEXT = "#6b6a66"

const MODES: { id: PeriodMode; label: string }[] = [
  { id: "current", label: "Joriy oy" },
  { id: "previous", label: "O'tgan oy" },
  { id: "month", label: "Oy tanlash" },
  { id: "range", label: "Oraliq" },
]

const count = (n: number) => Math.round(Number(n) || 0).toLocaleString("uz-UZ")

function Change({ value, inverse }: { value: number; inverse?: boolean }) {
  if (!value) return <span className="text-muted-foreground">0%</span>
  // For churn, an increase is bad, so the colors flip.
  const good = inverse ? value < 0 : value > 0
  return (
    <span className={cn("font-medium", good ? "text-emerald-600" : "text-red-600")}>
      {value > 0 ? "▲" : "▼"} {Math.abs(value)}%
    </span>
  )
}

function Kpi({
  label,
  value,
  change,
  previous,
  inverse,
  accent,
}: {
  label: string
  value: string
  change: number
  previous: string
  inverse?: boolean
  accent: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
        <Change value={change} inverse={inverse} />
        <span className="text-muted-foreground">oldingi davr: {previous}</span>
      </div>
    </div>
  )
}

function SeriesTooltip({
  active,
  payload,
  label,
  periodLabel,
  money,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string; dataKey?: string }[]
  label?: string
  periodLabel: (v: string) => string
  money?: boolean
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
      <p className="mb-1 text-xs font-medium text-foreground">{label ? periodLabel(label) : ""}</p>
      {payload.map(e => (
        <p key={e.dataKey} className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: e.color }} />
          {e.name}:{" "}
          <span className="font-medium text-foreground">
            {money ? som(e.value ?? 0) : count(e.value ?? 0)}
          </span>
        </p>
      ))}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}

export function SubscribersClient() {
  const [mode, setMode] = useState<PeriodMode>("current")
  const [month, setMonth] = useState(() => todayTashkent().slice(0, 7))
  const [rangeFrom, setRangeFrom] = useState(() => `${todayTashkent().slice(0, 7)}-01`)
  const [rangeTo, setRangeTo] = useState(() => todayTashkent())
  const [stats, setStats] = useState<SubscriberStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const resolve = useCallback(
    () => resolvePeriod(mode, month, rangeFrom, rangeTo),
    [mode, month, rangeFrom, rangeTo],
  )

  const rangeInvalid = mode === "range" && isRangeInvalid(rangeFrom, rangeTo)

  const load = useCallback(async () => {
    const period = resolve()
    if (!period) return
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    const res = await getSubscriberStatsAction(period.from, period.to)
    if (id !== requestId.current) return // a newer request superseded this one
    if (res.success) setStats(res.data)
    else setError(res.error)
    setLoading(false)
  }, [resolve])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on period change
    load()
  }, [load])

  const monthly = stats?.period.granularity === "month"
  const periodLabel = monthly ? monthLabel : dayLabel
  const cur = stats?.current
  const prev = stats?.previous
  const empty =
    !!stats &&
    stats.series.every(r => r.joined === 0 && r.churned === 0 && r.revenue === 0) &&
    stats.current.active === 0

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Obunachilar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ro&apos;yxatdan o&apos;tgan mijozlar harakati va yetkazilgan buyurtmalar tushumi.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Davr">
          {MODES.map(m => (
            <Button
              key={m.id}
              role="tab"
              aria-selected={mode === m.id}
              size="sm"
              variant={mode === m.id ? "default" : "outline"}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </Button>
          ))}
        </div>

        {mode === "month" && (
          <div className="max-w-xs">
            <Input
              type="month"
              value={month}
              max={todayTashkent().slice(0, 7)}
              onChange={e => setMonth(e.target.value)}
              aria-label="Oy"
            />
          </div>
        )}

        {mode === "range" && (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={rangeFrom}
              max={rangeTo || undefined}
              onChange={e => setRangeFrom(e.target.value)}
              className="w-full sm:w-44"
              aria-label="Boshlanish sanasi"
            />
            <span className="text-muted-foreground">—</span>
            <Input
              type="date"
              value={rangeTo}
              min={rangeFrom || undefined}
              onChange={e => setRangeTo(e.target.value)}
              className="w-full sm:w-44"
              aria-label="Tugash sanasi"
            />
          </div>
        )}

        {rangeInvalid && (
          <p className="text-xs text-red-600">Boshlanish sanasi tugash sanasidan keyin bo&apos;lmasligi kerak.</p>
        )}

        {stats && (
          <p className="text-xs text-muted-foreground">
            Davr: <span className="font-medium text-foreground">{formatRange(stats.period.from, stats.period.to)}</span>
            {" · "}solishtirish: {formatRange(stats.period.previous_from, stats.period.previous_to)}
          </p>
        )}
      </div>

      {error ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Statistikani yuklashda xatolik: {error}
          </div>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Qayta urinish
          </Button>
        </div>
      ) : loading && !stats ? (
        <LoadingState />
      ) : stats && cur && prev ? (
        <div className={cn("space-y-6 transition-opacity", loading && "pointer-events-none opacity-60")}>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Faol obunachilar" value={count(cur.active)} change={stats.change.active} previous={count(prev.active)} accent={SERIES.income} />
            <Kpi label="Yangi qo'shilganlar" value={count(cur.joined)} change={stats.change.joined} previous={count(prev.joined)} accent={SERIES.third} />
            <Kpi label="Chiqib ketganlar" value={count(cur.churned)} change={stats.change.churned} previous={count(prev.churned)} inverse accent={SERIES.cost} />
            <Kpi label="Umumiy summa" value={som(cur.revenue)} change={stats.change.revenue} previous={som(prev.revenue)} accent={SERIES.fourth} />
          </section>

          {empty ? (
            <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
              Bu davrda ma&apos;lumot yo&apos;q
            </div>
          ) : (
            <>
              <ChartCard
                title="Qo'shilgan va chiqib ketganlar"
                description={monthly ? "Oylar bo'yicha" : "Kunlar bo'yicha"}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.series} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barGap={2}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="period" tickFormatter={periodLabel} tick={{ fontSize: 11, fill: AXIS_TEXT }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: AXIS_TEXT }} tickLine={false} axisLine={false} width={48} />
                    <Tooltip content={<SeriesTooltip periodLabel={periodLabel} />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: AXIS_TEXT, paddingTop: 8 }} />
                    <Bar dataKey="joined" name="Qo'shilgan" fill={SERIES.third} radius={[4, 4, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="churned" name="Chiqib ketgan" fill={SERIES.cost} radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Tushum"
                description={`Yetkazilgan buyurtmalar summasi · ${count(cur.orders)} ta buyurtma`}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.series} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="period" tickFormatter={periodLabel} tick={{ fontSize: 11, fill: AXIS_TEXT }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
                    <YAxis tickFormatter={compactSom} tick={{ fontSize: 11, fill: AXIS_TEXT }} tickLine={false} axisLine={false} width={64} />
                    <Tooltip content={<SeriesTooltip periodLabel={periodLabel} money />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                    <Bar dataKey="revenue" name="Tushum" fill={SERIES.income} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </>
          )}

          <p className="text-xs text-muted-foreground">
            Faol — davr oxirigacha ro&apos;yxatdan o&apos;tgan, o&apos;chirilmagan va bloklanmagan mijozlar. Chiqib ketgan — hisobini o&apos;chirganlar.
            Summa — davrdagi yetkazilgan buyurtmalar jami. Kunlar Toshkent vaqti bo&apos;yicha.
          </p>
        </div>
      ) : null}
    </div>
  )
}
