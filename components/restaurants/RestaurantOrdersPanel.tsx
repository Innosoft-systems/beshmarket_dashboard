"use client"

import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { loadRestaurantOrdersAction } from "@/lib/actions/restaurant-admin"
import type { Order } from "@/types/order"

const STATUS_LABELS: Record<string, string> = {
  pending: "Kutilmoqda",
  accepted: "Qabul qilindi",
  preparing: "Tayyorlanmoqda",
  ready: "Tayyor",
  assigned: "Kuryer tayinlandi",
  on_the_way_to_restaurant: "Restoranga ketmoqda",
  picked_up: "Olindi",
  on_way: "Yo'lda",
  arrived_at_customer: "Mijoz oldida",
  delivered: "Yetkazildi",
  rejected: "Rad etildi",
  cancelled: "Bekor qilindi",
}

/** Delivered and failed states are the two the eye looks for in a long list. */
const STATUS_STYLES: Record<string, string> = {
  delivered: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
  cancelled: "bg-muted text-muted-foreground",
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Naqd",
  payme: "Payme",
  click: "Click",
}

const som = (value: number) => `${Math.round(value || 0).toLocaleString("uz-UZ")} so'm`

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleString("uz-UZ", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—"

export function RestaurantOrdersPanel({
  restaurantId,
  initial,
}: {
  restaurantId: string
  initial: { data: Order[]; pagination: { totalPages: number; total: number } }
}) {
  const orders = useInfiniteList<Order>({
    initial: {
      items: initial.data,
      totalPages: initial.pagination.totalPages,
      total: initial.pagination.total,
    },
    loadPage: async page => {
      const result = await loadRestaurantOrdersAction(restaurantId, page)
      if (!result.success) return null
      return {
        items: result.data.data,
        totalPages: result.data.pagination.totalPages,
        total: result.data.pagination.total,
      }
    },
    getKey: order => order._id,
  })

  if (initial.pagination.total === 0) {
    return (
      <div className="rounded-xl border bg-card px-5 py-16 text-center text-sm text-muted-foreground">
        Bu joyda hali buyurtma yo&apos;q
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-5 py-4">
        <h2 className="text-sm font-semibold">Buyurtmalar</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Jami {initial.pagination.total} ta · {orders.items.length} tasi ko&apos;rsatilmoqda
        </p>
      </div>

      <ul className="divide-y">
        {orders.items.map(order => (
          <li key={order._id}>
            <Link
              href={`/orders?order_number=${order.order_number}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-muted/50"
            >
              <span className="w-32 shrink-0 font-medium tabular-nums">
                {order.order_number}
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-xs ${
                  STATUS_STYLES[order.status] ?? "bg-blue-50 text-blue-700"
                }`}
              >
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
              <span className="text-xs text-muted-foreground">
                {PAYMENT_LABELS[order.payment_method ?? ""] ?? order.payment_method ?? "—"}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {formatDate(order.createdAt)}
              </span>
              <span className="w-32 shrink-0 text-right font-semibold tabular-nums">
                {som(order.total)}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div ref={orders.sentinelRef} />

      {orders.loading && (
        <p className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Yuklanmoqda…
        </p>
      )}

      {orders.error && (
        <div className="px-5 py-4 text-center">
          <p className="text-xs text-red-500">{orders.error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={orders.loadMore}>
            Qayta urinish
          </Button>
        </div>
      )}

      {!orders.hasMore && !orders.loading && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Barcha buyurtmalar ko&apos;rsatildi
        </p>
      )}
    </div>
  )
}
