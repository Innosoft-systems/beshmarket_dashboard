import { getRmAccessToken } from '@/lib/auth/restaurant-session'
import { apiRequest } from '@/lib/api/client'
import { RestaurantProfileClient } from '@/components/restaurant/ProfileClient'

export default async function ProfilePage() {
  const token = await getRmAccessToken()

  const restaurantRes = await apiRequest<any>('/restaurants/my', { accessToken: token }).catch(() => null)
  const restaurant = restaurantRes?.data
  if (!restaurant) return <div className="p-6 text-destructive">Restoran topilmadi</div>

  const hoursRes = await apiRequest<any>(`/restaurants/${restaurant._id}/working-hours`, { accessToken: token }).catch(() => ({ data: [] }))

  return (
    <RestaurantProfileClient
      restaurant={restaurant}
      workingHours={hoursRes.data ?? []}
      accessToken={token ?? ''}
    />
  )
}
