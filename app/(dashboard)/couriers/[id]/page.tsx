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
    const [profileRes, balanceRes] = await Promise.all([
      apiRequest<any>(`/couriers/${id}`, { accessToken: token }),
      apiRequest<any>(`/couriers/${id}/balance`, { accessToken: token }).catch(() => ({ data: { balance: 0, transactions: [] }, status: 200 })),
    ])

    if (!profileRes.data) notFound()

    return <CourierDetailClient profile={profileRes.data} balanceData={balanceRes.data} />
  } catch {
    notFound()
  }
}
