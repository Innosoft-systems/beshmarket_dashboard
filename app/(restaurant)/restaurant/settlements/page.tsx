import type { Metadata } from "next"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import {
  RestaurantSettlementsClient,
  type LegacySettlement,
  type WalletData,
} from "@/components/restaurant-panel/RestaurantSettlementsClient"

export const metadata: Metadata = { title: "Balans va hisob-kitoblar | Restaurant" }

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function RestaurantSettlementsPage({ searchParams }: Props) {
  const token = await getAccessToken()
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)

  const [walletRes, legacyRes] = await Promise.all([
    apiRequest<WalletData>(`/restaurants/my/wallet?page=${page}&limit=20`, { accessToken: token }),
    apiRequest<{ data: LegacySettlement[] }>("/settlements/my?page=1&limit=6", { accessToken: token }).catch(() => null),
  ])

  return (
    <RestaurantSettlementsClient
      wallet={walletRes.data}
      legacySettlements={legacyRes?.data?.data ?? []}
    />
  )
}
