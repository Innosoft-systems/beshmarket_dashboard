import { getRmAccessToken } from '@/lib/auth/restaurant-session'
import { apiRequest } from '@/lib/api/client'
import { RestaurantDashboardClient } from '@/components/restaurant/DashboardClient'

export default async function RestaurantPage() {
  const token = await getRmAccessToken()

  const [restaurantRes, statsRes] = await Promise.all([
    apiRequest<any>('/restaurants/my', { accessToken: token }).catch(() => null),
    apiRequest<any>('/restaurants/my/stats', { accessToken: token }).catch(() => ({ data: {} })),
  ])

  if (!restaurantRes?.data) return <div className="p-6 text-destructive">Restoran topilmadi</div>

  return <RestaurantDashboardClient stats={statsRes.data ?? {}} accessToken={token ?? ''} />
}
