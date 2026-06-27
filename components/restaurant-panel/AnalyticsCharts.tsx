"use client"

import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface Props {
  stats: {
    weekly_trend: { _id: string; orders: number; revenue: number }[]
    monthly_trend: { _id: string; orders: number; revenue: number }[]
    status_breakdown: { _id: string; count: number }[]
    hourly_heatmap: { _id: number; orders: number }[]
    top_products: { _id: string; name_uz: string; price: number; order_count?: number; avg_rating?: number }[]
    this_month_revenue: number
    last_month_revenue: number
    revenue_growth: number
    today_orders: number
    total_orders: number
    pending_orders: number
    avg_rating: number
    total_revenue?: number
  }
}

const STATUS_COLORS: Record<string, string> = {
  delivered:                "#22c55e",
  pending:                  "#f59e0b",
  accepted:                 "#6366f1",
  assigned:                 "#818cf8",
  ready:                    "#8b5cf6",
  on_way:                   "#3b82f6",
  on_the_way_to_restaurant: "#7c3aed",
  picked_up:                "#f97316",
  arrived_at_customer:      "#14b8a6",
  rejected:                 "#ef4444",
  cancelled:                "#6b7280",
}
const STATUS_LABELS: Record<string, string> = {
  delivered:                "Yetkazildi",
  pending:                  "Kutilmoqda",
  accepted:                 "Qabul qilindi",
  assigned:                 "Kuryer tayinlandi",
  ready:                    "Tayyor",
  on_way:                   "Yo'lda",
  on_the_way_to_restaurant: "Restoranga ketmoqda",
  picked_up:                "Olindi",
  arrived_at_customer:      "Manzilga yetdi",
  rejected:                 "Rad etildi",
  cancelled:                "Bekor qilindi",
}

function fmt(n: number) {
  return n.toLocaleString("uz-UZ")
}

function shortDate(d: string) {
  const date = new Date(d)
  return `${date.getDate()}/${date.getMonth() + 1}`
}

const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]

// Fill missing days in trend
function fillDays(trend: { _id: string; orders: number; revenue: number }[], days: number) {
  const map = Object.fromEntries(trend.map(t => [t._id, t]))
  const result = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split("T")[0]
    result.push({ date: shortDate(key), orders: map[key]?.orders || 0, revenue: map[key]?.revenue || 0 })
  }
  return result
}

function fillHours(heatmap: { _id: number; orders: number }[]) {
  const map = Object.fromEntries(heatmap.map(h => [h._id, h.orders]))
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, "0")}:00`,
    orders: map[i] || 0,
  }))
}

export function AnalyticsCharts({ stats }: Props) {
  const weekly = fillDays(stats.weekly_trend, 7)
  const monthly = fillDays(stats.monthly_trend, 30)
  const hourly = fillHours(stats.hourly_heatmap)

  const pieData = stats.status_breakdown.map(s => ({
    name: STATUS_LABELS[s._id] || s._id,
    value: s.count,
    color: STATUS_COLORS[s._id] || "#6b7280",
  }))

  const growthPositive = stats.revenue_growth > 0
  const growthZero = stats.revenue_growth === 0

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Bu oy daromad" value={`${fmt(stats.this_month_revenue)} so'm`}>
          {growthZero
            ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><Minus className="h-3 w-3" /> 0%</span>
            : growthPositive
              ? <span className="flex items-center gap-1 text-xs text-green-600"><TrendingUp className="h-3 w-3" /> +{stats.revenue_growth}%</span>
              : <span className="flex items-center gap-1 text-xs text-red-500"><TrendingDown className="h-3 w-3" /> {stats.revenue_growth}%</span>
          }
        </KPI>
        <KPI label="Jami daromad" value={`${fmt(stats.total_revenue ?? 0)} so'm`} />
        <KPI label="Bugungi buyurtma" value={stats.today_orders} />
        <KPI label="Reyting" value={stats.avg_rating ? stats.avg_rating.toFixed(1) : "—"} />
      </div>

      {/* Row 1: 30-day area + 7-day bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 30-day area chart */}
        <div className="rounded-xl border bg-background p-4">
          <h3 className="font-medium text-sm mb-4">30 kunlik buyurtma trendi</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} width={30} />
              <Tooltip formatter={(v: number, n: string) => [n === "revenue" ? `${v.toLocaleString()} so'm` : v, n === "revenue" ? "Daromad" : "Buyurtma"]} />
              <Area type="monotone" dataKey="orders" stroke="#6366f1" fill="url(#orderGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="url(#revGrad)" strokeWidth={2} dot={false} yAxisId={0} hide />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 7-day grouped bar */}
        <div className="rounded-xl border bg-background p-4">
          <h3 className="font-medium text-sm mb-4">Haftalik buyurtma va daromad</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} width={30} />
              <Tooltip formatter={(v: number, n: string) => [n === "revenue" ? `${v.toLocaleString()} so'm` : v, n === "revenue" ? "Daromad" : "Buyurtma"]} />
              <Legend formatter={(v) => v === "orders" ? "Buyurtma" : "Daromad"} />
              <Bar dataKey="orders" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Pie + Hourly heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Status pie chart */}
        <div className="rounded-xl border bg-background p-4">
          <h3 className="font-medium text-sm mb-4">Buyurtmalar holati (30 kun)</h3>
          {pieData.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Ma'lumot yo'q</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
                      <span className="text-muted-foreground">{entry.name}</span>
                    </div>
                    <span className="font-medium">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Hourly heatmap bar */}
        <div className="rounded-xl border bg-background p-4">
          <h3 className="font-medium text-sm mb-4">Soatlik faollik (30 kun, UTC+5)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourly} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={3} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [v, "Buyurtma"]} />
              <Bar dataKey="orders" radius={[3, 3, 0, 0]}>
                {hourly.map((entry, i) => {
                  const max = Math.max(...hourly.map(h => h.orders), 1)
                  const intensity = entry.orders / max
                  const r = Math.round(99 + intensity * 56)
                  const g = Math.round(102 + intensity * (-102))
                  const b = Math.round(241 + intensity * (-241))
                  return <Cell key={i} fill={`rgb(${r},${g},${b})`} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Top products horizontal bar + table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Horizontal bar - top products */}
        <div className="rounded-xl border bg-background p-4">
          <h3 className="font-medium text-sm mb-4">Top mahsulotlar (buyurtmalar soni)</h3>
          {(stats.top_products || []).length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Ma'lumot yo'q</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                layout="vertical"
                data={(stats.top_products || []).slice(0, 6).map((p, i) => ({
                  name: p.name_uz.length > 16 ? p.name_uz.slice(0, 16) + "…" : p.name_uz,
                  orders: p.order_count || 0,
                  fill: CHART_COLORS[i],
                }))}
                margin={{ top: 4, right: 30, left: 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip formatter={(v: number) => [v, "Buyurtma"]} />
                <Bar dataKey="orders" radius={[0, 4, 4, 0]}>
                  {(stats.top_products || []).slice(0, 6).map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top products table */}
        <div className="rounded-xl border bg-background overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-medium text-sm">Top mahsulotlar jadvali</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="h-9 px-4 text-left font-medium text-xs">#</th>
                <th className="h-9 px-4 text-left font-medium text-xs">Mahsulot</th>
                <th className="h-9 px-4 text-right font-medium text-xs">Buyurtma</th>
                <th className="h-9 px-4 text-right font-medium text-xs">Narx</th>
                <th className="h-9 px-4 text-right font-medium text-xs">Reyting</th>
              </tr>
            </thead>
            <tbody>
              {(stats.top_products || []).map((p, i) => (
                <tr key={p._id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium truncate max-w-[140px]">{p.name_uz}</td>
                  <td className="px-4 py-2.5 text-right">{p.order_count || 0}</td>
                  <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{p.price?.toLocaleString()} so'm</td>
                  <td className="px-4 py-2.5 text-right text-xs">
                    {p.avg_rating ? <span className="text-amber-500">★ {p.avg_rating.toFixed(1)}</span> : "—"}
                  </td>
                </tr>
              ))}
              {!(stats.top_products?.length) && (
                <tr><td className="px-4 py-10 text-center text-muted-foreground text-sm" colSpan={5}>Mahsulot yo'q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KPI({ label, value, children, muted }: { label: string; value: string | number; children?: React.ReactNode; muted?: boolean }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${muted ? "text-muted-foreground" : ""}`}>{value}</p>
      {children}
    </div>
  )
}
