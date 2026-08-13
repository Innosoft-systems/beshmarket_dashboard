import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { TabletOrdersClient } from "@/components/orders/TabletOrdersClient"
import type { Order, PaginatedResponse, Restaurant } from "@/types"

export default async function TabletOrdersPage() {
  const token = await getAccessToken()

  const [ordersRes, restaurantRes] = await Promise.all([
    apiRequest<PaginatedResponse<Order>>("/orders?page=1&limit=200", {
      accessToken: token,
    }).catch(() => null),
    apiRequest<Restaurant>("/restaurants/my", { accessToken: token }).catch(
      () => null,
    ),
  ])

  return (
    <TabletOrdersClient
      initialOrders={ordersRes?.data?.data ?? []}
      restaurantName={restaurantRes?.data?.name ?? "Restoran"}
      venueType={restaurantRes?.data?.type}
    />
  )
}
