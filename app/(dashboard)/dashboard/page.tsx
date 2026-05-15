import type { Metadata } from "next"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { DashboardCharts } from "@/components/dashboard/DashboardCharts"

export const metadata: Metadata = { title: "Dashboard | BeshMarket" }

export default async function DashboardPage() {
  const token = await getAccessToken()

  const [ordersStats, courierStats, usersRes] = await Promise.all([
    apiRequest<any>("/orders/stats", { accessToken: token }).catch(() => ({
      data: { total_orders: 0, today_orders: 0, revenue_30d: 0, revenue_today: 0, daily_trend: [], top_restaurants: [], status_breakdown: [] },
    })),
    apiRequest<any>("/couriers/stats", { accessToken: token }).catch(() => ({
      data: { total: 0, online: 0, busy: 0, offline: 0, verified: 0 },
    })),
    apiRequest<any>("/users?limit=1", { accessToken: token }).catch(() => ({ data: { pagination: { total: 0 } } })),
  ])

  const usersCount = usersRes.data?.pagination?.total ?? usersRes.data?.total ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">BeshMarket platformasi umumiy ko'rinishi</p>
      </div>
      <DashboardCharts
        stats={ordersStats.data}
        courierStats={courierStats.data}
        usersCount={usersCount}
      />
    </div>
  )
}
