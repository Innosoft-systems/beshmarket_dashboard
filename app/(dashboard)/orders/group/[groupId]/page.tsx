import { Metadata } from "next"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { OrderGroupDetailClient } from "@/components/orders/OrderGroupDetailClient"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Multi-buyurtma tafsiloti | BeshMarket",
}

interface Props {
  params: Promise<{ groupId: string }>
}

export default async function OrderGroupDetailPage({ params }: Props) {
  const { groupId } = await params
  const token = await getAccessToken()

  try {
    const [ordersRes, couriersRes] = await Promise.all([
      apiRequest<any[]>(`/orders/group/${groupId}`, { accessToken: token }),
      apiRequest<any[]>(`/orders/group/${groupId}/suggested-couriers`, { accessToken: token }).catch(() => ({ data: [], status: 200 })),
    ])

    if (!ordersRes.data || ordersRes.data.length === 0) notFound()

    return (
      <OrderGroupDetailClient
        orders={ordersRes.data}
        couriers={couriersRes.data ?? []}
        groupId={groupId}
      />
    )
  } catch {
    notFound()
  }
}
