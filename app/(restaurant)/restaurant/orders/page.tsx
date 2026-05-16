import { getMyRestaurant } from '@/lib/api/restaurant-cache'
import { rmApiRequest } from '@/lib/api/restaurant-client'
import { RestaurantOrdersClient } from '@/components/restaurant/OrdersClient'

interface Props { searchParams: Promise<{ status?: string }> }

export default async function OrdersPage({ searchParams }: Props) {
  const { status = 'all' } = await searchParams
  const { restaurant, token } = await getMyRestaurant()
  const qs = new URLSearchParams({ limit: '50', restaurant_id: restaurant._id })
  if (status !== 'all') qs.set('status', status)
  const ordersRes = await rmApiRequest<any>(`/orders?${qs}`, { accessToken: token }).catch(() => ({ data: { data: [] } }))
  return <RestaurantOrdersClient orders={ordersRes.data?.data || []} accessToken={token} currentStatus={status} />
}
