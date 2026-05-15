import { Metadata } from "next"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { OrderDetailClient } from "@/components/orders/OrderDetailClient"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Buyurtma tafsiloti | BeshMarket",
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const token = await getAccessToken()

  try {
    const [orderRes, couriersRes] = await Promise.all([
      apiRequest<any>(`/orders/${id}`, { accessToken: token }),
      apiRequest<any[]>("/couriers", { accessToken: token }).catch(() => ({ data: [], status: 200 })),
    ])

    if (!orderRes.data) notFound()

    return <OrderDetailClient order={orderRes.data} couriers={couriersRes.data ?? []} />
  } catch {
    notFound()
  }
}
