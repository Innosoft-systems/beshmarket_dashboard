import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { RestaurantOverviewClient } from "@/components/restaurant-panel/RestaurantOverviewClient"

export default async function RestaurantHomePage() {
  const token = await getAccessToken()

  let restaurant: any = null
  let stats: any = {}

  try {
    const [restaurantRes, statsRes] = await Promise.all([
      apiRequest<any>("/restaurants/my", { accessToken: token }),
      apiRequest<any>("/restaurants/my/stats", { accessToken: token }).catch(() => ({ data: null })),
    ])
    restaurant = restaurantRes.data
    stats = statsRes.data || {}
  } catch {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold">Restoran topilmadi</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sizning akkauntingizga restoran biriktirilmagan. Admin bilan bog'laning.
        </p>
      </div>
    )
  }

  const weekly = stats.weeklyTrend || stats.weekly_trend || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{restaurant.name}</h1>
          <p className="text-sm text-muted-foreground">{restaurant.address}</p>
        </div>
        <RestaurantOverviewClient restaurant={restaurant} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Metric label="Bugungi buyurtmalar" value={stats.todayOrders ?? 0} />
        <Metric label="Kutilmoqda" value={stats.pendingOrders ?? stats.pending ?? 0} />
        <Metric label="Jami buyurtmalar" value={stats.totalOrders ?? restaurant.total_orders ?? 0} />
        <Metric label="Reyting" value={restaurant.avg_rating ? restaurant.avg_rating.toFixed(1) : "0.0"} />
      </div>

      <div className="rounded-lg border bg-background p-4">
        <h2 className="font-medium">Haftalik trend</h2>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {weekly.length ? weekly.map((item: any) => (
            <div key={item._id || item.date} className="rounded-md border p-3 text-center">
              <p className="text-xs text-muted-foreground">{item._id || item.date}</p>
              <p className="text-lg font-semibold">{item.orders ?? item.count ?? 0}</p>
            </div>
          )) : (
            <p className="col-span-7 text-sm text-muted-foreground">Hali trend ma'lumoti yo'q.</p>
          )}
        </div>
      </div>
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
