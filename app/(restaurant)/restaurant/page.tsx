import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"
import { RestaurantOverviewClient } from "@/components/restaurant-panel/RestaurantOverviewClient"
import { AnalyticsCharts } from "@/components/restaurant-panel/AnalyticsCharts"

export default async function RestaurantHomePage() {
  const token = await getAccessToken()

  let restaurant: Record<string, any> | null = null
  let s: Record<string, any> = {}

  try {
    const [restaurantRes, statsRes] = await Promise.all([
      apiRequest<Record<string, any>>("/restaurants/my", { accessToken: token }),
      apiRequest<Record<string, any>>("/restaurants/my/stats", { accessToken: token }).catch(() => ({ data: {} })),
    ])
    restaurant = restaurantRes.data
    s = statsRes.data || {}
  } catch (err) {
    const isNotFound = err instanceof ApiError && (err.statusCode === 404 || err.statusCode === 403)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold">Restoran topilmadi</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isNotFound
            ? "Akkauntingizga restoran biriktirilmagan. Admin bilan bog'laning."
            : "Serverga ulanishda xatolik yuz berdi. Sahifani yangilang."}
        </p>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold">Restoran topilmadi</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Akkauntingizga restoran biriktirilmagan. Admin bilan bog'laning.
        </p>
      </div>
    )
  }

  const stats = {
    weekly_trend:       s.weekly_trend || [],
    monthly_trend:      s.monthly_trend || [],
    status_breakdown:   s.status_breakdown || [],
    hourly_heatmap:     s.hourly_heatmap || [],
    top_products:       s.top_products || [],
    this_month_revenue: s.this_month_revenue || 0,
    last_month_revenue: s.last_month_revenue || 0,
    revenue_growth:     s.revenue_growth || 0,
    today_orders:       s.today_orders || 0,
    total_orders:       s.total_orders || restaurant.total_orders || 0,
    pending_orders:     s.pending_orders || 0,
    avg_rating:         restaurant.avg_rating || 0,
    total_revenue:      s.total_revenue || 0,
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{restaurant.name}</h1>
          <p className="text-sm text-muted-foreground">{restaurant.address}</p>
        </div>
        <RestaurantOverviewClient restaurant={restaurant} />
      </div>
      <AnalyticsCharts stats={stats} />
    </div>
  )
}
