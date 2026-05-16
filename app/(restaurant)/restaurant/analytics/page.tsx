import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { AnalyticsCharts } from "@/components/restaurant-panel/AnalyticsCharts"

export default async function RestaurantAnalyticsPage() {
  const token = await getAccessToken()
  const [restaurantRes, statsRes, productsRes, reviewsRes] = await Promise.all([
    apiRequest<any>("/restaurants/my", { accessToken: token }),
    apiRequest<any>("/restaurants/my/stats", { accessToken: token }).catch(() => ({ data: {} })),
    apiRequest<any>("/products/my?limit=100", { accessToken: token }).catch(() => ({ data: { data: [] } })),
    apiRequest<any>("/reviews/my-restaurant?limit=1", { accessToken: token }).catch(() => ({ data: { total: 0 } })),
  ])

  const restaurant = restaurantRes.data
  const stats = statsRes.data || {}
  const products = productsRes.data?.data || productsRes.data || []
  const topProducts = [...products]
    .sort((a: any, b: any) => (b.order_count || 0) - (a.order_count || 0))
    .slice(0, 8)
  const weeklyTrend: { _id: string; orders: number; revenue: number }[] =
    stats.weekly_trend || stats.weeklyTrend || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analitika</h1>
        <p className="text-sm text-muted-foreground">Savdo, reyting va mahsulotlar ko'rsatkichlari</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Metric label="Jami buyurtma" value={stats.total_orders ?? stats.totalOrders ?? restaurant.total_orders ?? 0} />
        <Metric label="Bugungi buyurtma" value={stats.today_orders ?? stats.todayOrders ?? 0} />
        <Metric label="Mahsulotlar" value={products.length} />
        <Metric label="Izohlar" value={reviewsRes.data?.total ?? restaurant.review_count ?? 0} />
      </div>

      <AnalyticsCharts weeklyTrend={weeklyTrend} topProducts={topProducts} />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}
