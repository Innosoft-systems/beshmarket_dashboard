"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Clock, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ORDER_STATUSES } from "@/types"
import { useOrderSocket } from "@/hooks/use-order-socket"

interface Props {
  orders: any[]
  accessToken: string
}

export function RecentOrdersTable({ orders, accessToken }: Props) {
  useOrderSocket(accessToken)

  return (
    <div className="rounded-xl border bg-background overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          Oxirgi buyurtmalar
        </h3>
        <Link href="/orders" className="text-xs text-primary hover:underline flex items-center gap-1">
          Barchasini ko'rish <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Buyurtmalar yo'q</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="h-9 px-4 text-left text-xs font-medium text-muted-foreground">Buyurtma</th>
              <th className="h-9 px-4 text-left text-xs font-medium text-muted-foreground">Restoran</th>
              <th className="h-9 px-4 text-right text-xs font-medium text-muted-foreground">Summa</th>
              <th className="h-9 px-4 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="h-9 px-4 text-right text-xs font-medium text-muted-foreground">Vaqt</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order: any) => {
              const s = ORDER_STATUSES.find((o) => o.value === order.status)
              const date = new Date(order.createdAt)
              const timeStr = date.toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" })
              const isToday = date.toDateString() === new Date().toDateString()
              return (
                <tr key={order._id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <Link href={`/orders/${order._id}`} className="font-medium text-primary hover:underline text-xs">
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[120px] truncate">
                    {order.restaurant_id?.name || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs font-medium">
                    {order.total?.toLocaleString()} so'm
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className={`text-xs px-1.5 py-0 ${s?.color || ""}`}>
                      {s?.label || order.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                    {isToday ? timeStr : `${date.getDate()} · ${timeStr}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
