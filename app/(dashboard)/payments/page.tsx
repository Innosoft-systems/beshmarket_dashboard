import type { Metadata } from "next"
import { getAccessToken } from "@/lib/auth/session"
import { getPayments } from "@/lib/api/payments"
import { PaymentsTableClient } from "@/components/payments/PaymentsTableClient"

export const metadata: Metadata = { title: "To'lovlar | BeshMarket" }

interface Props {
  searchParams: Promise<{
    page?: string
    method?: string
    status?: string
    period?: string
    transaction_id?: string
  }>
}

export default async function PaymentsPage({ searchParams }: Props) {
  const accessToken = await getAccessToken()
  const params = await searchParams

  const page = Number(params.page) || 1
  const method = params.method || ""
  const status = params.status || ""
  const period = params.period || ""
  const transaction_id = params.transaction_id || ""

  // Period → date range
  let date_from = ""
  let date_to = ""
  const today = new Date()
  if (period === "today") {
    date_from = today.toISOString().split("T")[0]
    date_to = date_from
  } else if (period === "yesterday") {
    const y = new Date(today); y.setDate(y.getDate() - 1)
    date_from = y.toISOString().split("T")[0]
    date_to = date_from
  } else if (period === "week") {
    const w = new Date(today); w.setDate(w.getDate() - 7)
    date_from = w.toISOString().split("T")[0]
    date_to = today.toISOString().split("T")[0]
  } else if (period === "month") {
    const m = new Date(today); m.setDate(m.getDate() - 30)
    date_from = m.toISOString().split("T")[0]
    date_to = today.toISOString().split("T")[0]
  }

  const [listRes, paidRes, totalRes] = await Promise.all([
    getPayments({
      page,
      limit: 20,
      ...(method && { method }),
      ...(status && { status }),
      ...(date_from && { date_from }),
      ...(date_to && { date_to }),
      ...(transaction_id && { transaction_id }),
    }, accessToken).catch(() => ({ data: { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } } })),
    // paid stats (always all-time for summary cards)
    getPayments({ status: "paid", limit: 1 }, accessToken).catch(() => ({ data: { data: [], pagination: { total: 0 } } })),
    getPayments({ limit: 1 }, accessToken).catch(() => ({ data: { data: [], pagination: { total: 0 } } })),
  ])

  const payments = listRes.data?.data ?? []
  const pagination = listRes.data?.pagination ?? { total: 0, page: 1, limit: 20, totalPages: 1 }

  // Calculate paid amount from current filtered result for the stats
  const paidCount = paidRes.data?.pagination?.total ?? 0
  const totalCount = totalRes.data?.pagination?.total ?? 0

  // Sum from current page data (rough — server-side aggregate would be ideal but requires separate endpoint)
  const totalAmount = payments.reduce((s: number, p: any) => s + (p.amount || 0), 0)
  const paidAmount = payments.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + (p.amount || 0), 0)

  return (
    <PaymentsTableClient
      initialData={payments}
      totalPages={pagination.totalPages}
      currentPage={pagination.page}
      filters={{ method, status, period, search: transaction_id }}
      stats={{
        total: totalCount,
        totalAmount,
        paidCount,
        paidAmount,
      }}
    />
  )
}
