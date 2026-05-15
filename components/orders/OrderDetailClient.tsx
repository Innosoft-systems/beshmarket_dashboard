"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ORDER_STATUSES } from "@/types"
import { updateOrderStatusAction, cancelOrderAction, assignCourierAction } from "@/lib/actions/orders"
import { OrderTimer } from "@/components/orders/OrderTimer"

function StatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUSES.find((o) => o.value === status)
  return <Badge variant="outline" className={`text-sm ${s?.color || ""}`}>{s?.label || status}</Badge>
}

interface OrderDetailClientProps {
  order: any
  couriers?: { _id: string; user_id: any; is_active: boolean }[]
}

export function OrderDetailClient({ order, couriers = [] }: OrderDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [assigningCourier, setAssigningCourier] = useState(false)

  const changeStatus = async (status: string) => {
    const result = await updateOrderStatusAction(order._id, status)
    if (result.success) {
      toast.success("Status yangilandi")
      startTransition(() => router.refresh())
    } else {
      toast.error(result.error || "Xatolik")
    }
  }

  const cancel = async () => {
    const result = await cancelOrderAction(order._id, "Admin tomonidan bekor qilindi")
    if (result.success) {
      toast.success("Buyurtma bekor qilindi")
      startTransition(() => router.refresh())
    } else {
      toast.error(result.error || "Xatolik")
    }
  }

  const nextStatuses: Record<string, { value: string; label: string }[]> = {
    pending: [{ value: "accepted", label: "Qabul qilish" }],
    accepted: [{ value: "ready", label: "Tayyor" }],
    ready: [{ value: "on_way", label: "Yo'lga chiqdi" }],
    on_way: [{ value: "delivered", label: "Yetkazildi" }],
  }
  const available = nextStatuses[order.status] || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon-sm" onClick={() => router.push("/orders")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-medium">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(order.createdAt).toLocaleString("uz")}
          </p>
        </div>
        <StatusBadge status={order.status} />
        {(order.status === "pending" || order.status === "accepted") && (
          <OrderTimer createdAt={order.createdAt} />
        )}
      </div>

      {/* Actions */}
      {available.length > 0 && (
        <div className="flex gap-2">
          {available.map((s) => (
            <Button key={s.value} onClick={() => changeStatus(s.value)} disabled={isPending}>
              {s.label}
            </Button>
          ))}
          <Button variant="destructive" onClick={cancel} disabled={isPending}>
            Bekor qilish
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mijoz */}
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-medium">Mijoz</h3>
          <p>{order.client_id?.full_name || "Noma'lum"}</p>
          <p className="text-sm text-muted-foreground">{order.client_id?.phone}</p>
        </div>

        {/* Restoran */}
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-medium">Restoran</h3>
          <p>{order.restaurant_id?.name || "—"}</p>
        </div>

        {/* Manzil */}
        {order.address_id && (
          <div className="rounded-lg border p-4 space-y-2">
            <h3 className="font-medium">Yetkazish manzili</h3>
            <p>{order.address_id.address || order.address_id.street}</p>
            {order.address_id.apartment && <p className="text-sm text-muted-foreground">Xonadon: {order.address_id.apartment}</p>}
            {order.address_id.entrance && <p className="text-sm text-muted-foreground">Kirish: {order.address_id.entrance}</p>}
          </div>
        )}

        {/* Kuryer */}
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-medium">Kuryer</h3>
          {order.courier_id ? (
            <p>{order.courier_id.full_name || order.courier_id.phone || "Tayinlangan"}</p>
          ) : (
            <div className="space-y-2">
              <p className="text-muted-foreground">Tayinlanmagan</p>
              {couriers.length > 0 && !order.courier_id && (
                <select
                  className="w-full h-10 rounded-lg border border-input bg-transparent px-3 text-sm"
                  defaultValue=""
                  onChange={async (e) => {
                    if (!e.target.value) return
                    setAssigningCourier(true)
                    const result = await assignCourierAction(order._id, e.target.value)
                    setAssigningCourier(false)
                    if (result.success) {
                      toast.success("Kuryer tayinlandi")
                      startTransition(() => router.refresh())
                    } else {
                      toast.error(result.error || "Xatolik")
                    }
                  }}
                  disabled={assigningCourier}
                >
                  <option value="">Kuryer tanlang...</option>
                  {couriers.filter(c => c.is_active).map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.user_id?.full_name || c.user_id?.phone || c._id}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mahsulotlar */}
      <div className="rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-medium">Mahsulotlar</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="h-10 px-4 text-left font-medium">Nomi</th>
              <th className="h-10 px-4 text-center font-medium">Soni</th>
              <th className="h-10 px-4 text-right font-medium">Narxi</th>
              <th className="h-10 px-4 text-right font-medium">Jami</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item: any, i: number) => (
              <tr key={i} className="border-b last:border-0">
                <td className="px-4 py-3">{item.product_name}</td>
                <td className="px-4 py-3 text-center">{item.quantity}</td>
                <td className="px-4 py-3 text-right">{item.unit_price?.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{item.line_total?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 border-t space-y-1 text-sm">
          <div className="flex justify-between"><span>Mahsulotlar:</span><span>{order.subtotal?.toLocaleString()} so'm</span></div>
          <div className="flex justify-between"><span>Yetkazish:</span><span>{order.delivery_fee?.toLocaleString()} so'm</span></div>
          {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Chegirma:</span><span>-{order.discount?.toLocaleString()} so'm</span></div>}
          <div className="flex justify-between font-medium text-base pt-2 border-t"><span>Jami:</span><span>{order.total?.toLocaleString()} so'm</span></div>
        </div>
      </div>

      {/* Status tarixi */}
      {order.status_history?.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-medium">Status tarixi</h3>
          <div className="space-y-2">
            {order.status_history.map((entry: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <StatusBadge status={entry.status} />
                <span className="text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString("uz")}
                </span>
                {entry.note && <span className="text-muted-foreground">— {entry.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
