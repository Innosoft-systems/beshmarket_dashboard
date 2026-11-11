import { redirect } from "next/navigation"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { OrdersTableClient } from "@/components/orders/OrdersTableClient"
import { lastPageRedirect, parsePageParam, resolveOrderDateRange } from "@/lib/order-period"

interface Props {
  searchParams: Promise<{
    page?: string
    search?: string
    status?: string
    period?: string
    month?: string
    date_from?: string
    date_to?: string
  }>
}

export default async function RestaurantOrdersPage({ searchParams }: Props) {
  const token = await getAccessToken()
  const params = await searchParams
  const page = parsePageParam(params.page)
  const search = params.search || ""
  const status = params.status || ""
  const period = params.period || ""

  const month = params.month || ""
  const rawFrom = params.date_from || ""
  const rawTo = params.date_to || ""
  const { date_from, date_to } = resolveOrderDateRange({ period, month, date_from: rawFrom, date_to: rawTo })

  const query = new URLSearchParams({
    page: String(page),
    limit: "15",
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(date_from ? { date_from } : {}),
    ...(date_to ? { date_to } : {}),
  })

  const [ordersRes, statsRes] = await Promise.all([
    apiRequest<any>(`/orders?${query.toString()}`, { accessToken: token }).catch(() => null),
    apiRequest<any>("/orders/restaurant/my-stats", { accessToken: token }).catch(() => null),
  ])

  const response = ordersRes?.data
  const stats = statsRes?.data

  // Past the last page (hand-edited URL, stale back link): go to the last page instead of an empty table.
  const lastPage = lastPageRedirect("/restaurant/orders", params, "page", page, response?.pagination?.totalPages)
  if (lastPage) redirect(lastPage)

  return (
    <OrdersTableClient
      initialData={response?.data ?? []}
      totalPages={response?.pagination?.totalPages ?? 1}
      currentPage={response?.pagination?.page ?? page}
      filters={{ search, status, period, month, date_from: rawFrom, date_to: rawTo }}
      accessToken={token || ""}
      stats={{
        todayOrders: stats?.todayOrders ?? 0,
        totalOrders: stats?.totalOrders ?? response?.pagination?.total ?? 0,
        pendingOrders: stats?.pendingOrders ?? 0,
        onwayOrders: stats?.onwayOrders ?? 0,
      }}
      scope="restaurant"
    />
  )
}
