import { Metadata } from "next"
import { redirect, unstable_rethrow } from "next/navigation"
import { getOrders } from "@/lib/api/orders"
import { OrdersTableClient } from "@/components/orders/OrdersTableClient"
import { getAccessToken } from "@/lib/auth/session"
import { lastPageRedirect, parsePageParam, resolveOrderDateRange } from "@/lib/order-period"
import { todayTashkent } from "@/lib/subscribers-period"

export const metadata: Metadata = {
  title: "Buyurtmalar | BeshMarket",
}

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

export default async function OrdersPage({ searchParams }: Props) {
  const accessToken = await getAccessToken()
  const params = await searchParams

  const page = parsePageParam(params.page)
  const search = params.search || ""
  const status = params.status || ""
  const period = params.period || ""

  const month = params.month || ""
  const rawFrom = params.date_from || ""
  const rawTo = params.date_to || ""

  // Period -> date_from/date_to (Tashkent calendar days)
  const today = todayTashkent()
  const { date_from, date_to } = resolveOrderDateRange({ period, month, date_from: rawFrom, date_to: rawTo }, today)
  try {
    const responseRes = await getOrders({ page, limit: 15, ...(search && { search }), ...(status && { status }), ...(date_from && { date_from }), ...(date_to && { date_to }) }, accessToken)

    const response = responseRes.data

    // Past the last page (hand-edited URL, stale back link): go to the last page instead of an empty table.
    const lastPage = lastPageRedirect("/orders", params, "page", page, response?.pagination?.totalPages)
    if (lastPage) redirect(lastPage)

    // Stats — sequential to avoid throttle
    const todayRes = await getOrders({ limit: 1, date_from: today, date_to: today }, accessToken).catch(() => null)
    const pendingRes = await getOrders({ limit: 1, status: "pending" }, accessToken).catch(() => null)
    const onwayRes = await getOrders({ limit: 1, status: "on_way" }, accessToken).catch(() => null)

    const todayTotal = todayRes?.data?.pagination?.total ?? 0
    const pendingTotal = pendingRes?.data?.pagination?.total ?? 0
    const onwayTotal = onwayRes?.data?.pagination?.total ?? 0

    return (
      <OrdersTableClient
        initialData={response?.data ?? []}
        totalPages={response?.pagination?.totalPages ?? 1}
        currentPage={response?.pagination?.page ?? page}
        filters={{ search, status, period, month, date_from: rawFrom, date_to: rawTo }}
        accessToken={accessToken || ""}
        stats={{ todayOrders: todayTotal, totalOrders: response?.pagination?.total ?? 0, pendingOrders: pendingTotal, onwayOrders: onwayTotal }}
      />
    )
  } catch (err: any) {
    unstable_rethrow(err) // let redirect() through
    console.error("[OrdersPage] Error:", err?.message || err)
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Buyurtmalarni yuklashda xatolik yuz berdi.
      </div>
    )
  }
}
