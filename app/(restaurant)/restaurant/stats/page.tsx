import { getMyRestaurant } from '@/lib/api/restaurant-cache'
import { rmApiRequest } from '@/lib/api/restaurant-client'
import { RestaurantStatsClient } from '@/components/restaurant/StatsClient'

export default async function StatsPage() {
  const { token } = await getMyRestaurant()
  const statsRes = await rmApiRequest<any>('/restaurants/my/stats', { accessToken: token }).catch(() => ({ data: {} }))
  return <RestaurantStatsClient stats={statsRes.data ?? {}} />
}
