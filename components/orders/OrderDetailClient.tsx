"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowLeft,
  MapPin,
  Phone,
  User,
  Store,
  Truck,
  Package,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ORDER_STATUSES } from "@/types";
import {
  updateOrderStatusAction,
  cancelOrderAction,
  assignCourierAction,
} from "@/lib/actions/orders";
import { OrderTimer } from "@/components/orders/OrderTimer";

// Admin uchun ruxsat etilgan status o'tishlari
const ADMIN_TRANSITIONS: Record<string, { value: string; label: string }[]> = {
  pending: [
    { value: "accepted", label: "Qabul qilish" },
    { value: "rejected", label: "Rad etish" },
  ],
  accepted: [
    { value: "ready", label: "Tayyor" },
    { value: "assigned", label: "Kuryer tayinlash" },
  ],
  assigned: [
    { value: "on_the_way_to_restaurant", label: "Restoranga ketmoqda" },
  ],
  on_the_way_to_restaurant: [{ value: "picked_up", label: "Olindi" }],
  picked_up: [{ value: "on_the_way_to_customer", label: "Mijozga ketmoqda" }],
  on_the_way_to_customer: [
    { value: "arrived_at_customer", label: "Manzilga yetdi" },
    { value: "delivered", label: "Yetkazildi" },
  ],
  arrived_at_customer: [{ value: "delivered", label: "Yetkazildi" }],
  ready: [{ value: "on_way", label: "Yo'lga chiqdi" }],
  on_way: [{ value: "delivered", label: "Yetkazildi" }],
  delivered: [],
  rejected: [],
  cancelled: [],
};

function StatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUSES.find((o) => o.value === status);
  return (
    <Badge variant="outline" className={s?.color || ""}>
      {s?.label || status}
    </Badge>
  );
}

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-background p-4 space-y-3">
      <h3 className="font-medium flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </h3>
      {children}
    </div>
  );
}

interface Props {
  order: any;
  couriers?: any[];
  scope?: "admin" | "restaurant";
}

export function OrderDetailClient({
  order,
  couriers = [],
  scope = "admin",
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState("");
  const [assigningCourier, setAssigningCourier] = useState(false);

  const restaurantTransitions: Record<
    string,
    { value: string; label: string }[]
  > = {
    pending: [
      { value: "accepted", label: "Qabul qilish" },
      { value: "rejected", label: "Rad etish" },
    ],
    accepted: [{ value: "ready", label: "Tayyor" }],
  };
  const available =
    scope === "restaurant"
      ? restaurantTransitions[order.status] || []
      : ADMIN_TRANSITIONS[order.status] || [];
  const canCancel = !["delivered", "rejected", "cancelled"].includes(
    order.status,
  );

  const CONFIRM_STATUSES = ["rejected", "ready", "delivered"];

  const handleStatusClick = (s: { value: string; label: string }) => {
    if (CONFIRM_STATUSES.includes(s.value)) {
      setConfirmStatus(s);
    } else {
      changeStatus(s.value);
    }
  };

  const changeStatus = async (status: string) => {
    const result = await updateOrderStatusAction(order._id, status);
    if (result.success) {
      toast.success("Status yangilandi");
      startTransition(() => router.refresh());
    } else toast.error(result.error || "Xatolik");
  };

  const confirmChangeStatus = async () => {
    if (!confirmStatus) return;
    setStatusLoading(true);
    await changeStatus(confirmStatus.value);
    setStatusLoading(false);
    setConfirmStatus(null);
  };

  const handleAssignCourier = async () => {
    if (!selectedCourier) return;
    setAssigningCourier(true);
    const result = await assignCourierAction(order._id, selectedCourier);
    setAssigningCourier(false);
    if (result.success) {
      toast.success("Kuryer tayinlandi");
      startTransition(() => router.refresh());
    } else toast.error(result.error || "Xatolik");
  };

  const address = order.address_id;
  const fullAddress =
    address?.full_address || address?.address || address?.street || "—";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="outline"
          onClick={() =>
            router.push(
              scope === "restaurant" ? "/restaurant/orders" : "/orders",
            )
          }
        >
          <ArrowLeft className="h-5 w-5" /> Orqaga
        </Button>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold">{order.order_number}</h1>
            <StatusBadge status={order.status} />
            {["pending", "accepted"].includes(order.status) && (
              <OrderTimer createdAt={order.createdAt} />
            )}
            <span className="text-sm text-muted-foreground">
              {new Date(order.createdAt).toLocaleString("uz")}
              {order.completed_at &&
                ` · Yetkazildi: ${new Date(order.completed_at).toLocaleString("uz")}`}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {(available.length > 0 || canCancel) && (
        <div className="flex flex-wrap gap-2 p-4 rounded-xl border bg-muted/30">
          {available.map((s) => (
            <Button
              key={s.value}
              size="sm"
              onClick={() => handleStatusClick(s)}
              disabled={isPending}
            >
              {s.label}
            </Button>
          ))}
          {canCancel && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setCancelOpen(true)}
              disabled={isPending}
            >
              Bekor qilish
            </Button>
          )}
        </div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard icon={User} title="Mijoz">
          <p className="font-medium">
            {order.client_id?.full_name || "Noma'lum"}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            {order.client_id?.phone || "—"}
          </p>
        </InfoCard>

        <InfoCard icon={Store} title="Restoran">
          <p className="font-medium">{order.restaurant_id?.name || "—"}</p>
          {order.restaurant_id?.phone && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {order.restaurant_id.phone}
            </p>
          )}
        </InfoCard>

        <InfoCard icon={MapPin} title="Yetkazish manzili">
          <p className="text-sm font-medium">{fullAddress}</p>
          {address?.district && (
            <p className="text-xs text-muted-foreground">{address.district}</p>
          )}
          {address?.entrance && (
            <p className="text-xs text-muted-foreground">
              Kirish: {address.entrance}
              {address.floor ? `, Qavat: ${address.floor}` : ""}
              {address.apartment ? `, Xonadon: ${address.apartment}` : ""}
            </p>
          )}
          {address?.comment && (
            <p className="text-xs text-muted-foreground italic">
              {address.comment}
            </p>
          )}
        </InfoCard>

        <InfoCard icon={Truck} title="Kuryer">
          {order.courier_id ? (
            <div className="space-y-1">
              <p className="font-medium">
                {order.courier_id?.user_id?.full_name || "Tayinlangan"}
              </p>
              {order.courier_id?.user_id?.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {order.courier_id.user_id.phone}
                </p>
              )}
              {order.estimated_delivery_time && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ETA: {order.estimated_delivery_time} daqiqa
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Tayinlanmagan</p>
              {scope === "admin" && couriers.length > 0 && (
                <div className="flex gap-2">
                  <Select
                    value={selectedCourier}
                    onValueChange={(v) => setSelectedCourier(v ?? "")}
                  >
                    <SelectTrigger className="flex-1 h-9">
                      <SelectValue>
                        {couriers.find((c) => c._id === selectedCourier)
                          ?.user_id?.full_name || "Kuryer tanlang..."}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {couriers
                        .filter((c) => c.is_active)
                        .map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {c.user_id?.full_name || c.user_id?.phone} ·{" "}
                            {c.status}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    disabled={!selectedCourier || assigningCourier}
                    onClick={handleAssignCourier}
                  >
                    Tayinlash
                  </Button>
                </div>
              )}
            </div>
          )}
        </InfoCard>
      </div>

      {/* Izohlar */}
      {(order.courier_note || order.restaurant_note) && (
        <div className="rounded-xl border bg-background p-4 space-y-2">
          <h3 className="font-medium text-sm">Izohlar</h3>
          {order.restaurant_note && (
            <p className="text-sm">
              <span className="text-muted-foreground">Restoran: </span>
              {order.restaurant_note}
            </p>
          )}
          {order.courier_note && (
            <p className="text-sm">
              <span className="text-muted-foreground">Kuryer: </span>
              {order.courier_note}
            </p>
          )}
        </div>
      )}

      {/* Mahsulotlar */}
      <div className="rounded-xl border overflow-hidden">
        <div className="p-4 border-b flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm">
            Mahsulotlar ({order.items?.length || 0} ta)
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
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
                <td className="px-4 py-3 text-right">
                  {item.unit_price?.toLocaleString()} so'm
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {item.line_total?.toLocaleString()} so'm
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 border-t space-y-1.5 text-sm bg-muted/10">
          <div className="flex justify-between text-muted-foreground">
            <span>Mahsulotlar:</span>
            <span>{order.subtotal?.toLocaleString()} so'm</span>
          </div>
          {order.delivery_fee > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Yetkazish:</span>
              <span>{order.delivery_fee?.toLocaleString()} so'm</span>
            </div>
          )}
          {order.service_fee > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Xizmat:</span>
              <span>{order.service_fee?.toLocaleString()} so'm</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Chegirma:</span>
              <span>-{order.discount?.toLocaleString()} so'm</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-base pt-2 border-t">
            <span>Jami:</span>
            <span>{order.total?.toLocaleString()} so'm</span>
          </div>
        </div>
      </div>

      {/* Status tarixi */}
      {order.status_history?.length > 0 && (
        <div className="rounded-xl border bg-background p-4 space-y-3">
          <h3 className="font-medium text-sm">Status tarixi</h3>
          <div className="space-y-2">
            {[...order.status_history]
              .reverse()
              .map((entry: any, i: number) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <StatusBadge status={entry.status} />
                  <span className="text-muted-foreground text-xs">
                    {new Date(entry.created_at).toLocaleString("uz")}
                  </span>
                  {entry.note && (
                    <span className="text-muted-foreground text-xs">
                      — {entry.note}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Status transition confirm */}
      <ConfirmDialog
        open={!!confirmStatus}
        onOpenChange={(open) => {
          if (!open) setConfirmStatus(null);
        }}
        title={`Buyurtma statusini o'zgartirish`}
        description={`Buyurtmani "${confirmStatus?.label}" holatiga o'tkazmoqchimisiz?`}
        confirmLabel={confirmStatus?.label || "Tasdiqlash"}
        loading={statusLoading}
        onConfirm={confirmChangeStatus}
      />

      {/* Cancel confirm */}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Buyurtmani bekor qilish"
        description="Bu buyurtmani bekor qilishni xohlaysizmi?"
        confirmLabel="Bekor qilish"
        variant="destructive"
        loading={cancelLoading}
        onConfirm={async () => {
          setCancelLoading(true);
          const result = await cancelOrderAction(
            order._id,
            scope === "restaurant"
              ? "Restoran tomonidan bekor qilindi"
              : "Admin tomonidan bekor qilindi",
          );
          setCancelLoading(false);
          setCancelOpen(false);
          if (result.success) {
            toast.success("Buyurtma bekor qilindi");
            startTransition(() => router.refresh());
          } else toast.error(result.error || "Xatolik");
        }}
      />
    </div>
  );
}
