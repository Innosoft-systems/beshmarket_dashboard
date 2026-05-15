import { Metadata } from "next"
import { getOrders } from "@/lib/api/orders"
import { OrdersTableClient } from "@/components/orders/OrdersTableClient"
import { getAccessToken } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Buyurtmalar | BeshMarket",
}

interface Props {
  searchParams: Promise<{ page?: string; search?: string; status?: string; period?: string }>
}

export default async function OrdersPage({ searchParams }: Props) {
  const accessToken = await getAccessToken()
  const params = await searchParams

  const page = Number(params.page) || 1
  const search = params.search || ""
  const status = params.status || ""
  const period = params.period || ""

  // Period dan date_from/date_to hisoblash
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

  // Bugungi statistika uchun alohida so'rov
  const todayStr = new Date().toISOString().split("T")[0]

  try {
    const [responseRes, todayRes] = await Promise.all([
      getOrders(
        {
          page,
          limit: 15,
          ...(search && { search }),
          ...(status && { status }),
          ...(date_from && { date_from }),
          ...(date_to && { date_to }),
        },
        accessToken,
      ),
      getOrders({ limit: 1, date_from: todayStr, date_to: todayStr }, accessToken),
    ])

    const response = responseRes.data
    const todayTotal = todayRes.data?.pagination?.total ?? 0

    return (
      <OrdersTableClient
        initialData={response?.data ?? []}
        totalPages={response?.pagination?.totalPages ?? 1}
        currentPage={response?.pagination?.page ?? page}
        filters={{ search, status, period }}
        accessToken={accessToken || ""}
        stats={{ todayOrders: todayTotal, totalOrders: response?.pagination?.total ?? 0 }}
      />
    )
  } catch {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Buyurtmalarni yuklashda xatolik yuz berdi.
      </div>
    )
  }
}
