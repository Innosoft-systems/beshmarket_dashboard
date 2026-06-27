"use client"

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { TrendingUp, ShoppingBag, Truck, Star, DollarSign, Users } from "lucide-react"

const COLORS = ["#22c55e", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899"]

/** So'mni o'qilishi oson formatga o'girish */
function formatSum(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} mlrd so'm`
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} mln so'm`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} ming so'm`
  return `${amount.toLocaleString()} so'm`
}

/** Y axis uchun qisqa format */
function shortSum(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}mlrd`
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}mln`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}ming`
  return String(amount)
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string; sub?: string; color: string
}) {
  return (
    <div className={`rounded-xl border ${color} bg-background p-5 space-y-3`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold leading-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

interface Props {
  stats: any
  courierStats: any
  usersCount: number
}

export function DashboardCharts({ stats, courierStats, usersCount }: Props) {
  const safeStats = {
    total_orders: stats.total_orders ?? 0,
    today_orders: stats.today_orders ?? 0,
    revenue_30d: stats.revenue_30d ?? 0,
    revenue_today: stats.revenue_today ?? 0,
    revenue_total: stats.revenue_total ?? 0,
    daily_trend: stats.daily_trend ?? [],
    top_restaurants: stats.top_restaurants ?? [],
    top_clients: stats.top_clients ?? [],
    status_breakdown: stats.status_breakdown ?? [],
    pending_now: stats.pending_now ?? 0,
    active_orders: stats.active_orders ?? 0,
    avg_delivery_minutes: stats.avg_delivery_minutes ?? null,
    pending_reviews: stats.pending_reviews ?? 0,
    pending_penalties: stats.pending_penalties ?? 0,
    revenue_change_pct: stats.revenue_change_pct ?? null,
    orders_change_pct: stats.orders_change_pct ?? null,
  }

  const safeCourier = {
    online: courierStats?.online ?? 0,
    busy: courierStats?.busy ?? 0,
    offline: courierStats?.offline ?? 0,
    verified: courierStats?.verified ?? 0,
  }

  // 7 kunlik trend — to'liq so'm saqlanadi, display uchun formatlanadi
  const UZ_MONTHS = ["Yan","Fev","Mar","Apr","May","Iyn","Iyl","Avg","Sen","Okt","Noy","Dek"]

  const trendData = (() => {
    const map = new Map(safeStats.daily_trend.map((d: any) => [d._id as string, d]))
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const key = d.toISOString().split("T")[0]
      const label = `${d.getDate()} ${UZ_MONTHS[d.getMonth()]}`
      const entry = (map.get(key) as any) || { orders: 0, revenue: 0 }
      return { date: label, Buyurtmalar: entry.orders, revenue: entry.revenue }
    })
  })()

  const statusLabels: Record<string, string> = {
    pending: "Kutilmoqda", accepted: "Qabul qilindi", delivered: "Yetkazildi",
    rejected: "Rad etilgan", cancelled: "Bekor qilingan", assigned: "Tayinlangan",
    on_way: "Yo'lda", on_the_way_to_restaurant: "Restoranga", picked_up: "Olib ketildi",
    arrived_at_customer: "Yetib keldi", ready: "Tayyor",
  }

  const statusData = safeStats.status_breakdown.map((s: any) => ({
    name: statusLabels[s._id as string] || s._id,
    value: s.count,
  })).sort((a: any, b: any) => b.value - a.value)

  const courierPieData = [
    { name: "Onlayn", value: safeCourier.online },
    { name: "Band", value: safeCourier.busy },
    { name: "Oflayn", value: safeCourier.offline },
  ].filter(d => d.value > 0)

  const topRest = safeStats.top_restaurants.map((r: any) => ({
    name: (r.name || "Noma'lum").slice(0, 16),
    Buyurtmalar: r.orders,
    revenue: r.revenue,
  }))

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard
          icon={ShoppingBag}
          label="Jami buyurtmalar"
          value={safeStats.total_orders.toLocaleString()}
          sub={`Bugun: ${safeStats.today_orders.toLocaleString()} ta · Faol: ${safeStats.active_orders ?? 0}`}
          color="border-blue-500"
        />
        <KpiCard
          icon={DollarSign}
          label="Jami daromad"
          value={formatSum(safeStats.revenue_total)}
          sub={`Bugun: ${formatSum(safeStats.revenue_today)}`}
          color="border-emerald-500"
        />
        <KpiCard
          icon={DollarSign}
          label="30 kunlik daromad"
          value={formatSum(safeStats.revenue_30d)}
          sub={safeStats.revenue_change_pct != null
            ? `${safeStats.revenue_change_pct > 0 ? "+" : ""}${safeStats.revenue_change_pct}% o'tgan oyga nisbatan`
            : `Bugun: ${formatSum(safeStats.revenue_today)}`}
          color="border-green-500"
        />
        <KpiCard
          icon={Truck}
          label="Faol kuryerlar"
          value={String(safeCourier.online + safeCourier.busy)}
          sub={`Onlayn: ${safeCourier.online} · Band: ${safeCourier.busy} · Oflayn: ${safeCourier.offline}`}
          color="border-amber-500"
        />
        <KpiCard
          icon={Users}
          label="Foydalanuvchilar"
          value={usersCount.toLocaleString()}
          sub={`${safeCourier.verified} ta kuryer tasdiqlangan`}
          color="border-purple-500"
        />
      </div>

      {/* Mini stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Kutilmoqda", value: safeStats.pending_now ?? 0, color: "text-amber-600", border: "border-amber-600" },
          { label: "O'rtacha yetkazish", value: safeStats.avg_delivery_minutes ? `${safeStats.avg_delivery_minutes} daq` : "—", color: "text-blue-600", border: "border-blue-600" },
          { label: "Tasdiq kutgan izohlar", value: safeStats.pending_reviews ?? 0, color: "text-violet-600", border: "border-violet-600" },
          { label: "Tasdiq kutgan jarimalar", value: safeStats.pending_penalties ?? 0, color: "text-red-600", border: "border-red-600" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border ${s.border} bg-background px-4 py-3 flex items-center justify-between`}>
            <span className="text-xs text-muted-foreground">{s.label}</span>
            <span className={`font-bold text-lg ${s.color}`}>{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</span>
          </div>
        ))}
      </div>

      {/* Area Chart — 7 kunlik trend */}
      <div className="rounded-xl border bg-background p-5">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-500" />
          7 kunlik buyurtmalar va daromad trendi
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={trendData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => shortSum(v)}
              width={70}
            />
            <Tooltip
              formatter={(value: number, name: string) =>
                name === "revenue" ? [formatSum(value), "Daromad"] : [value, "Buyurtmalar"]
              }
            />
            <Legend formatter={(v) => v === "revenue" ? "Daromad" : "Buyurtmalar"} />
            <Area yAxisId="left" type="monotone" dataKey="Buyurtmalar" stroke="#3b82f6" fill="url(#gOrders)" strokeWidth={2} />
            <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="#22c55e" fill="url(#gRevenue)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bar charts column */}
        <div className="md:col-span-2 space-y-6">
          {/* Top restoranlar */}
          <div className="rounded-xl border bg-background p-5">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Top 10 restoran (30 kun)
            </h3>
            {topRest.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Ma'lumot yo'q</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topRest} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number, name: string) =>
                    name === "revenue" ? [formatSum(value), "Daromad"] : [value, "Buyurtmalar"]} />
                  <Legend formatter={(v) => v === "revenue" ? "Daromad" : "Buyurtmalar"} />
                  <Bar dataKey="Buyurtmalar" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top mijozlar */}
          <div className="rounded-xl border bg-background p-5">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              Top 10 mijoz (30 kun)
            </h3>
            {safeStats.top_clients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Ma'lumot yo'q</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart
                  data={safeStats.top_clients.map((c: any, i: number) => ({
                    name: (c.name || c.phone || "Noma'lum").slice(0, 12),
                    Buyurtmalar: c.orders,
                    spent: c.spent,
                  }))}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gClients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gSpent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => shortSum(v)} width={60} />
                  <Tooltip formatter={(value: number, name: string) =>
                    name === "spent" ? [formatSum(value), "Sarflagan"] : [value, "Buyurtmalar"]} />
                  <Legend formatter={(v) => v === "spent" ? "Sarflagan" : "Buyurtmalar"} />
                  <Area yAxisId="left" type="monotone" dataKey="Buyurtmalar" stroke="#8b5cf6" fill="url(#gClients)" strokeWidth={2} dot={{ r: 3 }} />
                  <Area yAxisId="right" type="monotone" dataKey="spent" stroke="#ec4899" fill="url(#gSpent)" strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pie charts */}
        <div className="space-y-6">
          {/* Order statuses */}
          <div className="rounded-xl border bg-background p-5 py-6">
            <h3 className="font-medium mb-3 text-sm">Buyurtmalar holati</h3>
            {statusData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center" style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>Ma'lumot yo'q</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" nameKey="name" paddingAngle={2}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}>
                    {statusData.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} ta`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Courier status */}
          <div className="rounded-xl border bg-background p-5">
            <h3 className="font-medium mb-3 text-sm">Kuryerlar holati</h3>
            {courierPieData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center" style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>Kuryerlar yo'q</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={courierPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" nameKey="name" paddingAngle={2}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}>
                    {courierPieData.map((_: any, i: number) => (
                      <Cell key={i} fill={["#22c55e", "#f59e0b", "#9ca3af"][i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} ta`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

