import { Metadata } from "next"
import { getOrders } from "@/lib/api/orders"
import { OrdersTableClient } from "@/components/orders/OrdersTableClient"
import { getAccessToken } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Buyurtmalar | BeshMarket",
}

interface Props {
  searchParams: Promise<{ page?: string; order_number?: string; status?: string }>
}

export default async function OrdersPage({ searchParams }: Props) {
  const accessToken = await getAccessToken()
  const params = await searchParams

  const page = Number(params.page) || 1
  const search = params.order_number || ""
  const status = params.status || ""

  try {
    const { data: response } = await getOrders(
      {
        page,
        limit: 15,
        ...(search && { order_number: search }),
        ...(status && { status }),
      },
      accessToken,
    )

    return (
      <OrdersTableClient
        initialData={response?.data ?? []}
        totalPages={response?.pagination?.totalPages ?? 1}
        currentPage={response?.pagination?.page ?? page}
        filters={{ search, status }}
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
