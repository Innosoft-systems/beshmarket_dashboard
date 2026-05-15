import { Metadata } from "next"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { CourierDetailClient } from "@/components/couriers/CourierDetailClient"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Kuryer profili | BeshMarket",
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function CourierDetailPage({ params }: Props) {
  const { id } = await params
  const token = await getAccessToken()

  try {
    const [profileRes, balanceRes, ordersRes, incomeRes] = await Promise.all([
      apiRequest<any>(`/couriers/${id}`, { accessToken: token }),
      apiRequest<any>(`/couriers/${id}/balance`, { accessToken: token }).catch(() => ({ data: { balance: 0, transactions: [] }, status: 200 })),
      apiRequest<any>(`/orders?courier_id=${id}&limit=20`, { accessToken: token }).catch(() => ({ data: { data: [] }, status: 200 })),
      apiRequest<any>(`/couriers/${id}/income?period=month`, { accessToken: token }).catch(() => ({ data: { total: 0 }, status: 200 })),
    ])

    if (!profileRes.data) notFound()

    return (
      <CourierDetailClient
        profile={profileRes.data}
        balanceData={balanceRes.data}
        orders={ordersRes.data?.data || ordersRes.data || []}
        monthlyIncome={incomeRes.data?.total || 0}
      />
    )
  } catch {
    notFound()
  }
}
