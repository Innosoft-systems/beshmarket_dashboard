import { getMyRestaurant } from '@/lib/api/restaurant-cache'
import { rmApiRequest } from '@/lib/api/restaurant-client'
import { RestaurantMenuClient } from '@/components/restaurant/MenuClient'

export default async function MenuPage() {
  const { restaurant, token } = await getMyRestaurant()
  const [catsRes, prodsRes] = await Promise.all([
    rmApiRequest<any>(`/menu-categories/menu?restaurant_id=${restaurant._id}&limit=50`, { accessToken: token }).catch(() => ({ data: { data: [] } })),
    rmApiRequest<any>(`/products?restaurant_id=${restaurant._id}&limit=200`, { accessToken: token }).catch(() => ({ data: { data: [] } })),
  ])
  return <RestaurantMenuClient restaurant={restaurant} categories={catsRes.data?.data || catsRes.data || []} products={prodsRes.data?.data || prodsRes.data || []} accessToken={token} />
}
