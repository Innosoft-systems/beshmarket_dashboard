import { getRmAccessToken } from '@/lib/auth/restaurant-session'
import { apiRequest } from '@/lib/api/client'
import { RestaurantOrdersClient } from '@/components/restaurant/OrdersClient'

interface Props { searchParams: Promise<{ status?: string }> }

export default async function OrdersPage({ searchParams }: Props) {
  const { status = 'all' } = await searchParams
  const token = await getRmAccessToken()

  const restaurantRes = await apiRequest<any>('/restaurants/my', { accessToken: token }).catch(() => null)
  const restaurantId = restaurantRes?.data?._id

  const qs = new URLSearchParams({ limit: '50' })
  if (restaurantId) qs.set('restaurant_id', restaurantId)
  if (status !== 'all') qs.set('status', status)

  const ordersRes = await apiRequest<any>(`/orders?${qs}`, { accessToken: token }).catch(() => ({ data: { data: [] } }))

  return (
    <RestaurantOrdersClient
      orders={ordersRes.data?.data || []}
      accessToken={token ?? ''}
      currentStatus={status}
    />
  )
}
