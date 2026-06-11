"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ArrowLeft, MapPin, Phone, User, Store, Truck, Package, Clock, Layers } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ORDER_STATUSES } from "@/types"
import { cancelOrderAction, assignGroupCourierAction } from "@/lib/actions/orders"
import { OrderTimer } from "@/components/orders/OrderTimer"

function StatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUSES.find((o) => o.value === status)
  return (
    <Badge variant="outline" className={s?.color || ""}>
      {s?.label || status}
    </Badge>
  )
}

function InfoCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-background p-4 space-y-3">
      <h3 className="font-medium flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </h3>
      {children}
    </div>
  )
}

interface Props {
  orders: any[]
  couriers?: any[]
  groupId: string
}

export function OrderGroupDetailClient({ orders, couriers = [], groupId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const [selectedCourier, setSelectedCourier] = useState("")
  const [assigningCourier, setAssigningCourier] = useState(false)

  const refresh = () => startTransition(() => router.refresh())

  const sharedCourier = orders.find((o) => o.courier_id)?.courier_id ?? null
  const sharedAddress = orders[0]?.address_id
  const sharedClient = orders[0]?.client_id
  const groupTotal = orders.reduce((s: number, o: any) => s + (o.total || 0), 0)
  const allDelivered = orders.every((o) => ["delivered", "rejected", "cancelled"].includes(o.status))
  const isActive = orders.some((o) => !["delivered", "rejected", "cancelled"].includes(o.status))

  const handleAssignCourier = async () => {
    if (!selectedCourier) return
    setAssigningCourier(true)
    const result = await assignGroupCourierAction(groupId, selectedCourier)
    setAssigningCourier(false)
    if (result.success) {
      toast.success("Kuryer barcha buyurtmalarga tayinlandi")
      refresh()
    } else {
      toast.error(result.error || "Xatolik")
    }
  }

  const handleCancelOrder = async () => {
    if (!cancelTargetId) return
    setCancelLoading(true)
    const result = await cancelOrderAction(cancelTargetId, "Admin tomonidan bekor qilindi")
    setCancelLoading(false)
    setCancelOpen(false)
    setCancelTargetId(null)
    if (result.success) {
      toast.success("Buyurtma bekor qilindi")
      refresh()
    } else {
      toast.error(result.error || "Xatolik")
    }
  }

  const fullAddress = sharedAddress?.full_address || sharedAddress?.address || sharedAddress?.street || "—"

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="outline" onClick={() => router.push("/orders")}>
          <ArrowLeft className="h-5 w-5" /> Orqaga
        </Button>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-2xl font-semibold">
                {orders.map((o) => o.order_number).join(" + ")}
              </h1>
            </div>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              Multi-buyurtma
            </Badge>
            {orders.map((o) => (
              <StatusBadge key={o._id} status={o.status} />
            ))}
            {orders.some((o) => ["pending", "accepted"].includes(o.status)) && (
              <OrderTimer createdAt={orders[0].createdAt} />
            )}
            <span className="text-sm text-muted-foreground">
              {new Date(orders[0].createdAt).toLocaleString("uz")}
            </span>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard icon={User} title="Mijoz">
          <p className="font-medium">{sharedClient?.full_name || "Noma'lum"}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            {sharedClient?.phone || "—"}
          </p>
        </InfoCard>

        <InfoCard icon={MapPin} title="Yetkazish manzili">
          <p className="text-sm font-medium">{fullAddress}</p>
          {sharedAddress?.district && (
            <p className="text-xs text-muted-foreground">{sharedAddress.district}</p>
          )}
          {sharedAddress?.entrance && (
            <p className="text-xs text-muted-foreground">
              Kirish: {sharedAddress.entrance}
              {sharedAddress.floor ? `, Qavat: ${sharedAddress.floor}` : ""}
              {sharedAddress.apartment ? `, Xonadon: ${sharedAddress.apartment}` : ""}
            </p>
          )}
          {sharedAddress?.comment && (
            <p className="text-xs text-muted-foreground italic">{sharedAddress.comment}</p>
          )}
        </InfoCard>

        <InfoCard icon={Truck} title="Kuryer">
          {sharedCourier ? (
            <div className="space-y-1">
              <p className="font-medium">{sharedCourier?.user_id?.full_name || "Tayinlangan"}</p>
              {sharedCourier?.user_id?.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {sharedCourier.user_id.phone}
                </p>
              )}
              {orders[0]?.estimated_delivery_time && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ETA: {orders[0].estimated_delivery_time} daqiqa
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Tayinlanmagan</p>
              {couriers.length > 0 && (
                <div className="flex gap-2">
                  <Select value={selectedCourier} onValueChange={(v) => setSelectedCourier(v ?? "")}>
                    <SelectTrigger className="flex-1 h-9">
                      <SelectValue>
                        {couriers.find((c) => c._id === selectedCourier)?.full_name || "Kuryer tanlang..."}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {couriers.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.full_name || c.phone} · {c.distance_km != null ? `${c.distance_km} km` : c.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" disabled={!selectedCourier || assigningCourier} onClick={handleAssignCourier}>
                    Tayinlash
                  </Button>
                </div>
              )}
            </div>
          )}
        </InfoCard>

        <InfoCard icon={Store} title={`Restoranlar (${orders.length} ta)`}>
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o._id} className="space-y-0.5">
                <p className="font-medium text-sm">{o.restaurant_id?.name || "—"}</p>
                {o.restaurant_id?.phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {o.restaurant_id.phone}
                  </p>
                )}
              </div>
            ))}
          </div>
        </InfoCard>
      </div>

      {/* Per-order items + actions */}
      {orders.map((order) => {
        const canCancel = !["delivered", "rejected", "cancelled"].includes(order.status)
        return (
          <div key={order._id} className="rounded-xl border overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between gap-2 bg-muted/20">
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{order.order_number}</span>
                <StatusBadge status={order.status} />
                <span className="text-xs text-muted-foreground">{order.restaurant_id?.name}</span>
              </div>
              {canCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => { setCancelTargetId(order._id); setCancelOpen(true) }}
                  disabled={isPending}
                >
                  Bekor qilish
                </Button>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/10">
                  <th className="h-9 px-4 text-left font-medium">Nomi</th>
                  <th className="h-9 px-4 text-center font-medium">Soni</th>
                  <th className="h-9 px-4 text-right font-medium">Narxi</th>
                  <th className="h-9 px-4 text-right font-medium">Jami</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item: any, i: number) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-2.5">{item.product_name}</td>
                    <td className="px-4 py-2.5 text-center">{item.quantity}</td>
                    <td className="px-4 py-2.5 text-right">{item.unit_price?.toLocaleString()} so'm</td>
                    <td className="px-4 py-2.5 text-right font-medium">{item.line_total?.toLocaleString()} so'm</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2.5 border-t text-sm bg-muted/10 flex justify-between text-muted-foreground">
              <span>Restoran jami:</span>
              <span className="font-medium text-foreground">{order.total?.toLocaleString()} so'm</span>
            </div>
          </div>
        )
      })}

      {/* Group total */}
      <div className="rounded-xl border bg-background p-4 space-y-1.5 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Yetkazish:</span>
          <span>{orders.reduce((s: number, o: any) => s + (o.delivery_fee || 0), 0).toLocaleString()} so'm</span>
        </div>
        {orders.some((o) => o.discount > 0) && (
          <div className="flex justify-between text-green-600">
            <span>Chegirma:</span>
            <span>-{orders.reduce((s: number, o: any) => s + (o.discount || 0), 0).toLocaleString()} so'm</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-base pt-2 border-t">
          <span>Umumiy jami:</span>
          <span>{groupTotal.toLocaleString()} so'm</span>
        </div>
      </div>

      {/* Status histories */}
      {orders.map((order) =>
        order.status_history?.length > 0 ? (
          <div key={`hist-${order._id}`} className="rounded-xl border bg-background p-4 space-y-3">
            <h3 className="font-medium text-sm">
              {order.order_number} — Status tarixi
            </h3>
            <div className="space-y-2">
              {[...order.status_history].reverse().map((entry: any, i: number) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <StatusBadge status={entry.status} />
                  <span className="text-muted-foreground text-xs">
                    {new Date(entry.created_at).toLocaleString("uz")}
                  </span>
                  {entry.note && (
                    <span className="text-muted-foreground text-xs">— {entry.note}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null
      )}

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={(open) => { setCancelOpen(open); if (!open) setCancelTargetId(null) }}
        title="Buyurtmani bekor qilish"
        description="Bu buyurtmani bekor qilishni xohlaysizmi?"
        confirmLabel="Bekor qilish"
        variant="destructive"
        loading={cancelLoading}
        onConfirm={handleCancelOrder}
      />
    </div>
  )
}
