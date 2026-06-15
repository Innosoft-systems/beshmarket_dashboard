import type { Metadata } from "next"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"
import { RestaurantSettlementsClient } from "@/components/restaurant-panel/RestaurantSettlementsClient"

export const metadata: Metadata = { title: "Hisob-kitoblar | Restaurant" }

interface Props {
  searchParams: Promise<{ page?: string; status?: string }>
}

export default async function RestaurantSettlementsPage({ searchParams }: Props) {
  const token = await getAccessToken()
  const params = await searchParams
  const page = Number(params.page) || 1
  const status = params.status || ""

  const query = new URLSearchParams({ page: String(page), limit: "15" })
  if (status) query.set("status", status)

  let settlements: any[] = []
  let totalPages = 1
  let currentPage = 1
  let stats = { total: 0, pendingCount: 0, pendingPayoutTotal: 0, paidCount: 0, paidPayoutTotal: 0 }

  try {
    const { data } = await apiRequest<any>(`/settlements/my?${query}`, { accessToken: token })
    settlements = data?.data ?? []
    const pagination = data?.pagination ?? {}
    totalPages = pagination.totalPages ?? 1
    currentPage = pagination.page ?? 1

    const allRes = await apiRequest<any>("/settlements/my?limit=1000", { accessToken: token }).catch(() => null)
    const all: any[] = allRes?.data?.data ?? []
    stats = {
      total: allRes?.data?.pagination?.total ?? 0,
      pendingCount: all.filter((s) => s.status === "pending").length,
      pendingPayoutTotal: all.filter((s) => s.status === "pending").reduce((sum, s) => sum + (s.payout_amount || 0), 0),
      paidCount: all.filter((s) => s.status === "paid").length,
      paidPayoutTotal: all.filter((s) => s.status === "paid").reduce((sum, s) => sum + (s.payout_amount || 0), 0),
    }
  } catch (err) {
    if (err instanceof ApiError && (err.statusCode === 404 || err.statusCode === 403)) {
      // empty state
    } else {
      throw err
    }
  }

  return (
    <RestaurantSettlementsClient
      initialData={settlements}
      totalPages={totalPages}
      currentPage={currentPage}
      filters={{ status }}
      stats={stats}
    />
  )
}
