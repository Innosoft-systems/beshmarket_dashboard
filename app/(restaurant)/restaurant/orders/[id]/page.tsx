import { notFound } from "next/navigation"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"
import { OrderDetailClient } from "@/components/orders/OrderDetailClient"

interface Props {
  params: Promise<{ id: string }>
}

export default async function RestaurantOrderDetailPage({ params }: Props) {
  const { id } = await params
  const token = await getAccessToken()

  try {
    const { data: order } = await apiRequest<any>(`/orders/${id}`, { accessToken: token })
    if (!order) notFound()
    return <OrderDetailClient order={order} scope="restaurant" />
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) notFound()
    throw err
  }
}
