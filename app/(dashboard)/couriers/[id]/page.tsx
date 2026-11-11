import { Metadata } from "next"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { CourierDetailClient } from "@/components/couriers/CourierDetailClient"
import { notFound, redirect, unstable_rethrow } from "next/navigation"
import { lastPageRedirect, parsePageParam, resolveOrderDateRange } from "@/lib/order-period"

export const metadata: Metadata = {
  title: "Kuryer profili | BeshMarket",
}

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    orders_page?: string
    orders_status?: string
    orders_period?: string
    orders_month?: string
    orders_from?: string
    orders_to?: string
  }>
}

const ORDERS_LIMIT = 20
const HISTORY_STATUSES = ["all", "delivered", "cancelled"]

export default async function CourierDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams
  const token = await getAccessToken()

  // Order history filters live in the URL (orders_* keys) so "Orqaga" from an order restores them.
  const ordersPage = parsePageParam(sp.orders_page)
  const ordersStatus = HISTORY_STATUSES.includes(sp.orders_status ?? "") ? sp.orders_status! : "delivered"
  const ordersFilters = {
    status: ordersStatus,
    period: sp.orders_period || "",
    month: sp.orders_month || "",
    date_from: sp.orders_from || "",
    date_to: sp.orders_to || "",
  }
  const range = resolveOrderDateRange(ordersFilters)
  const ordersQuery = new URLSearchParams({
    courier_id: id,
    page: String(ordersPage),
    limit: String(ORDERS_LIMIT),
    ...(ordersStatus !== "all" && { status: ordersStatus }),
    ...(range.date_from && { date_from: range.date_from }),
    ...(range.date_to && { date_to: range.date_to }),
  })

  try {
    const [profileRes, balanceRes, ordersRes, incomeRes, weeklyRes, allMonthlyRes, documentsRes, bookingsRes] = await Promise.all([
      apiRequest<any>(`/couriers/${id}`, { accessToken: token }),
      apiRequest<any>(`/couriers/${id}/balance`, { accessToken: token }).catch(() => ({ data: { balance: 0, transactions: [] }, status: 200 })),
      apiRequest<any>(`/orders?${ordersQuery.toString()}`, { accessToken: token }).catch(() => ({ data: { data: [], pagination: null }, status: 200 })),
      apiRequest<any>(`/couriers/${id}/income?period=month`, { accessToken: token }).catch(() => ({ data: { total: 0 }, status: 200 })),
      apiRequest<any>(`/couriers/${id}/income?period=week`, { accessToken: token }).catch(() => ({ data: { total: 0 }, status: 200 })),
      apiRequest<any>(`/couriers/${id}/income/all-months`, { accessToken: token }).catch(() => ({ data: { data: [] }, status: 200 })),
      apiRequest<any>(`/couriers/${id}/documents`, { accessToken: token }).catch(() => ({ data: null, status: 200 })),
      apiRequest<any>(`/shifts/admin/couriers/${id}/bookings`, { accessToken: token }).catch(() => ({ data: [], status: 200 })),
    ])

    if (!profileRes.data) notFound()

    const ordersPayload = ordersRes.data
    const orders = Array.isArray(ordersPayload) ? ordersPayload : ordersPayload?.data || []
    const pagination = Array.isArray(ordersPayload) ? null : ordersPayload?.pagination

    // Past the last history page (hand-edited URL, stale back link): go to the last page.
    const lastPage = lastPageRedirect(`/couriers/${encodeURIComponent(id)}`, sp, "orders_page", ordersPage, pagination?.totalPages)
    if (lastPage) redirect(lastPage)

    return (
      <CourierDetailClient
        profile={profileRes.data}
        balanceData={balanceRes.data}
        orders={orders}
        ordersPagination={{
          page: pagination?.page ?? ordersPage,
          totalPages: pagination?.totalPages ?? 1,
          total: pagination?.total ?? orders.length,
        }}
        ordersFilters={ordersFilters}
        monthlyIncome={incomeRes.data?.total || 0}
        monthlyChart={allMonthlyRes.data?.data || []}
        weeklyIncome={weeklyRes.data?.total || 0}
        documents={documentsRes.data || null}
        upcomingSlots={Array.isArray(bookingsRes.data) ? bookingsRes.data : []}
      />
    )
  } catch (err) {
    unstable_rethrow(err) // let redirect() / notFound() through
    notFound()
  }
}
