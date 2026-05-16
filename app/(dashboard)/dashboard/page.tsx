import type { Metadata } from "next"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { DashboardCharts } from "@/components/dashboard/DashboardCharts"
import { RecentOrdersTable } from "@/components/dashboard/RecentOrdersTable"
import { RecentPenaltiesTable } from "@/components/dashboard/RecentPenaltiesTable"
import { CouriersMapWidget } from "@/components/dashboard/CouriersMapWidget"

export const metadata: Metadata = { title: "Dashboard | BeshMarket" }

export default async function DashboardPage() {
  const token = await getAccessToken()

  const [ordersStats, courierStats, usersRes, recentOrdersRes, onlineCouriersRes, penaltiesRes] = await Promise.all([
    apiRequest<any>("/orders/stats", { accessToken: token }).catch(() => ({ data: {} })),
    apiRequest<any>("/couriers/stats", { accessToken: token }).catch(() => ({ data: { total: 0, online: 0, busy: 0, offline: 0, verified: 0 } })),
    apiRequest<any>("/users?limit=1", { accessToken: token }).catch(() => ({ data: { pagination: { total: 0 } } })),
    apiRequest<any>("/orders?limit=15&page=1", { accessToken: token }).catch(() => ({ data: { data: [] } })),
    apiRequest<any>("/couriers?status=online,busy&limit=100", { accessToken: token }).catch(() => ({ data: { data: [] } })),
    apiRequest<any>("/shifts/penalties?limit=10&page=1", { accessToken: token }).catch(() => ({ data: { data: [] } })),
  ])

  const usersCount = usersRes.data?.pagination?.total ?? usersRes.data?.total ?? 0
  const recentOrders = recentOrdersRes.data?.data ?? []
  const onlineCouriers = onlineCouriersRes.data?.data ?? []
  const recentPenalties = penaltiesRes.data?.data ?? []

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

      {/* Oxirgi buyurtmalar + jarimalar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentOrdersTable orders={recentOrders} accessToken={token || ""} />
        <RecentPenaltiesTable penalties={recentPenalties} />
      </div>

      {/* Kuryerlar xaritasi */}
      <CouriersMapWidget couriers={onlineCouriers} accessToken={token || ""} />
    </div>
  )
}
