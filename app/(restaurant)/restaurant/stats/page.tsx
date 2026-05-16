import { getRmAccessToken } from '@/lib/auth/restaurant-session'
import { apiRequest } from '@/lib/api/client'
import { RestaurantStatsClient } from '@/components/restaurant/StatsClient'

export default async function StatsPage() {
  const token = await getRmAccessToken()

  const restaurantRes = await apiRequest<any>('/restaurants/my', { accessToken: token }).catch(() => null)
  const restaurant = restaurantRes?.data
  if (!restaurant) return <div className="p-6 text-destructive">Restoran topilmadi</div>

  const statsRes = await apiRequest<any>('/restaurants/my/stats', { accessToken: token }).catch(() => ({ data: {} }))

  return <RestaurantStatsClient stats={statsRes.data ?? {}} />
}
