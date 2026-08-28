import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Package } from "lucide-react"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { RestaurantDetailClient } from "@/components/restaurants/RestaurantDetailClient"
import type { WalletData } from "@/components/restaurants/RestaurantWalletPanel"
import type { Restaurant } from "@/types"
import type { Order } from "@/types/order"

export const metadata: Metadata = { title: "Restoran | BeshMarket" }

interface OrdersPage {
  data: Order[]
  pagination: { page: number; totalPages: number; total: number }
}

const EMPTY_ORDERS: OrdersPage = {
  data: [],
  pagination: { page: 1, totalPages: 1, total: 0 },
}

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const token = await getAccessToken()
  const { id } = await params

  // The wallet and the first page of orders are fetched alongside the venue so
  // the tabs are populated on first paint; either can fail without taking the
  // page down, since the venue itself is what the page is about.
  const [restaurantRes, walletRes, ordersRes] = await Promise.all([
    apiRequest<Restaurant>(`/restaurants/admin/${id}`, { accessToken: token }).catch(
      () => null,
    ),
    apiRequest<WalletData>(`/restaurants/admin/${id}/wallet?page=1&limit=20`, {
      accessToken: token,
    }).catch(() => null),
    apiRequest<OrdersPage>(`/orders?restaurant_id=${id}&page=1&limit=20`, {
      accessToken: token,
    }).catch(() => null),
  ])

  if (!restaurantRes?.data) {
    return (
      <div className="space-y-4">
        <Link
          href="/restaurants"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Restoranlar
        </Link>
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
          Restoran topilmadi yoki yuklashda xatolik yuz berdi.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/restaurants"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Restoranlar
        </Link>
        <Button variant="outline" size="sm" className="gap-2" render={<Link href={`/restaurants/${id}/products`} />}>
          <Package className="h-4 w-4" /> Mahsulotlar
        </Button>
      </div>

      <RestaurantDetailClient
        restaurant={restaurantRes.data}
        wallet={walletRes?.data ?? null}
        orders={ordersRes?.data ?? EMPTY_ORDERS}
      />
    </div>
  )
}
