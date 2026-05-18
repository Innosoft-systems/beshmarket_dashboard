import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { OrdersTableClient } from "@/components/orders/OrdersTableClient"

interface Props {
  searchParams: Promise<{ page?: string; search?: string; status?: string; period?: string }>
}

export default async function RestaurantOrdersPage({ searchParams }: Props) {
  const token = await getAccessToken()
  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.search || ""
  const status = params.status || ""
  const period = params.period || ""

  let date_from = ""
  let date_to = ""
  const today = new Date()
  if (period === "today") {
    date_from = today.toISOString().split("T")[0]
    date_to = date_from
  } else if (period === "yesterday") {
    const y = new Date(today)
    y.setDate(y.getDate() - 1)
    date_from = y.toISOString().split("T")[0]
    date_to = date_from
  } else if (period === "week") {
    const w = new Date(today)
    w.setDate(w.getDate() - 7)
    date_from = w.toISOString().split("T")[0]
    date_to = today.toISOString().split("T")[0]
  } else if (period === "month") {
    const m = new Date(today)
    m.setDate(m.getDate() - 30)
    date_from = m.toISOString().split("T")[0]
    date_to = today.toISOString().split("T")[0]
  }

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

  return (
    <OrdersTableClient
      initialData={response?.data ?? []}
      totalPages={response?.pagination?.totalPages ?? 1}
      currentPage={response?.pagination?.page ?? page}
      filters={{ search, status, period }}
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
