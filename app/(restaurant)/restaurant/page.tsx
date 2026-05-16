import { getMyRestaurant } from '@/lib/api/restaurant-cache'
import { rmApiRequest } from '@/lib/api/restaurant-client'
import { RestaurantDashboardClient } from '@/components/restaurant/DashboardClient'

export default async function RestaurantPage() {
  const { restaurant, token } = await getMyRestaurant()
  const statsRes = await rmApiRequest<any>('/restaurants/my/stats', { accessToken: token }).catch(() => ({ data: {} }))
  return <RestaurantDashboardClient stats={statsRes.data ?? {}} accessToken={token} />
}
