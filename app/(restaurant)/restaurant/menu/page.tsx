import { getRmAccessToken } from '@/lib/auth/restaurant-session'
import { apiRequest } from '@/lib/api/client'
import { RestaurantMenuClient } from '@/components/restaurant/MenuClient'

export default async function MenuPage() {
  const token = await getRmAccessToken()

  const restaurantRes = await apiRequest<any>('/restaurants/my', { accessToken: token }).catch(() => null)
  const restaurant = restaurantRes?.data
  if (!restaurant) return <div className="p-6 text-destructive">Restoran topilmadi</div>

  const [catsRes, prodsRes] = await Promise.all([
    apiRequest<any>(`/menu-categories/menu?restaurant_id=${restaurant._id}&limit=50`, { accessToken: token }).catch(() => ({ data: { data: [] } })),
    apiRequest<any>(`/products?restaurant_id=${restaurant._id}&limit=200`, { accessToken: token }).catch(() => ({ data: { data: [] } })),
  ])

  return (
    <RestaurantMenuClient
      restaurant={restaurant}
      categories={catsRes.data?.data || catsRes.data || []}
      products={prodsRes.data?.data || prodsRes.data || []}
      accessToken={token ?? ''}
    />
  )
}
