import { getMyRestaurant } from '@/lib/api/restaurant-cache'
import { rmApiRequest } from '@/lib/api/restaurant-client'
import { RestaurantProfileClient } from '@/components/restaurant/ProfileClient'

export default async function ProfilePage() {
  const { restaurant, token } = await getMyRestaurant()
  const hoursRes = await rmApiRequest<any>('/restaurants/my/working-hours', { accessToken: token }).catch(() => ({ data: [] }))
  return <RestaurantProfileClient restaurant={restaurant} workingHours={hoursRes.data ?? []} accessToken={token} />
}
