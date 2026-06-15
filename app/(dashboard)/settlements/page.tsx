import type { Metadata } from "next"
import { getAccessToken } from "@/lib/auth/session"
import { getSettlements } from "@/lib/api/settlements"
import { getRestaurants } from "@/lib/api/restaurants"
import { SettlementsClient } from "@/components/settlements/SettlementsClient"

export const metadata: Metadata = { title: "Hisob-kitoblar | BeshMarket" }

interface Props {
  searchParams: Promise<{
    page?: string
    status?: string
    restaurant_id?: string
  }>
}

export default async function SettlementsPage({ searchParams }: Props) {
  const accessToken = await getAccessToken()
  const params = await searchParams

  const page = Number(params.page) || 1
  const status = params.status || ""
  const restaurant_id = params.restaurant_id || ""

  const [listRes, pendingRes, paidRes, restaurantsRes] = await Promise.all([
    getSettlements(
      {
        page,
        limit: 20,
        ...(status && { status }),
        ...(restaurant_id && { restaurant_id }),
      },
      accessToken,
    ).catch(() => ({
      data: { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } },
    })),
    getSettlements({ status: "pending", limit: 1 }, accessToken).catch(() => ({
      data: { data: [], pagination: { total: 0 } },
    })),
    getSettlements({ status: "paid", limit: 1 }, accessToken).catch(() => ({
      data: { data: [], pagination: { total: 0 } },
    })),
    getRestaurants({ limit: 200 }, accessToken).catch(() => ({
      data: { data: [], pagination: { total: 0, page: 1, limit: 200, totalPages: 1 } },
    })),
  ])

  const settlements = listRes.data?.data ?? []
  const pagination = listRes.data?.pagination ?? { total: 0, page: 1, limit: 20, totalPages: 1 }
  const totalCount = pagination.total

  const pendingCount = (pendingRes.data as any)?.pagination?.total ?? 0
  const paidCount = (paidRes.data as any)?.pagination?.total ?? 0

  const pendingPayoutTotal = settlements
    .filter((s: any) => s.status === "pending")
    .reduce((sum: number, s: any) => sum + (s.payout_amount || 0), 0)

  const paidPayoutTotal = settlements
    .filter((s: any) => s.status === "paid")
    .reduce((sum: number, s: any) => sum + (s.payout_amount || 0), 0)

  const restaurants = (restaurantsRes.data as any)?.data ?? []

  return (
    <SettlementsClient
      initialData={settlements}
      totalPages={pagination.totalPages}
      currentPage={pagination.page}
      filters={{ status, restaurant_id }}
      stats={{
        total: totalCount,
        pendingCount,
        pendingPayoutTotal,
        paidCount,
        paidPayoutTotal,
      }}
      restaurants={restaurants}
    />
  )
}
