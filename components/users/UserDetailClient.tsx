"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTransition } from "react"
import { ArrowLeft, Ban, Calendar, CheckCircle2, ChevronLeft, ChevronRight, Package, Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ORDER_STATUSES, type Order, type User } from "@/types"
import { formatDateTime, som } from "@/lib/format"

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  client: "Mijoz",
  kuryer: "Kuryer",
  restaurant: "Restoran",
}

function StatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUSES.find((o) => o.value === status)
  return (
    <Badge variant="outline" className={s?.color || ""}>
      {s?.label || status}
    </Badge>
  )
}

function OrderCard({ order }: { order: Order }) {
  const restaurant = typeof order.restaurant_id === "object" ? order.restaurant_id : null

  return (
    <div className="rounded-xl border bg-background overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 border-b bg-muted/30">
        <Link href={`/orders/${order._id}`} className="font-medium text-primary hover:underline">
          {order.order_number}
        </Link>
        <span className="text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</span>
        <span className="text-sm">{restaurant?.name || "—"}</span>
        <div className="ml-auto flex items-center gap-3">
          <StatusBadge status={order.status} />
          <span className="font-semibold whitespace-nowrap">{som(order.total)}</span>
        </div>
      </div>
      <ul className="divide-y text-sm">
        {order.items.map((item, i) => (
          <li key={i} className="flex items-start justify-between gap-4 px-5 py-2">
            <div className="min-w-0">
              <span className="text-muted-foreground">{item.quantity} ×</span>{" "}
              <span className="font-medium">{item.product_name}</span>
              {item.variant_label && <span className="text-muted-foreground"> ({item.variant_label})</span>}
              {!!item.selected_modifiers?.length && (
                <p className="text-xs text-muted-foreground">
                  + {item.selected_modifiers
                    .map((m) => (m.quantity > 1 ? `${m.name_uz} × ${m.quantity}` : m.name_uz))
                    .join(", ")}
                </p>
              )}
              {item.special_instructions && (
                <p className="text-xs text-muted-foreground italic">&quot;{item.special_instructions}&quot;</p>
              )}
            </div>
            <span className="whitespace-nowrap text-muted-foreground">{som(item.line_total)}</span>
          </li>
        ))}
      </ul>
      {order.cancel_reason && (
        <p className="px-5 py-2 border-t text-xs text-red-600">Bekor qilish sababi: {order.cancel_reason}</p>
      )}
    </div>
  )
}

interface Props {
  user: User
  orders: Order[]
  totalPages: number
  currentPage: number
}

export function UserDetailClient({ user, orders, totalPages, currentPage }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const stats = user.order_stats

  const goToPage = (page: number) => {
    startTransition(() => {
      router.push(page > 1 ? `${pathname}?page=${page}` : pathname)
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{user.full_name || "Ism kiritilmagan"}</h1>
            <Badge variant="outline">{ROLE_LABELS[user.role] ?? user.role}</Badge>
            <Badge
              variant={user.is_blocked ? "destructive" : "secondary"}
              className={!user.is_blocked ? "bg-green-100 text-green-700 border-green-200" : ""}
            >
              {user.is_blocked ? "Bloklangan" : "Faol"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">{user.phone}</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/users")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Orqaga
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-blue-500 bg-background p-5 space-y-2">
          <div className="flex items-center gap-2 text-blue-500">
            <Package className="h-4 w-4" />
            <span className="text-sm">Jami buyurtmalar</span>
          </div>
          <p className="text-3xl font-bold">{stats?.orders_count ?? 0}</p>
        </div>
        <div className="rounded-xl border border-green-500 bg-background p-5 space-y-2">
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">Yetkazilgan</span>
          </div>
          <p className="text-3xl font-bold">{stats?.delivered_count ?? 0}</p>
        </div>
        <div className="rounded-xl border border-red-500 bg-background p-5 space-y-2">
          <div className="flex items-center gap-2 text-red-500">
            <Ban className="h-4 w-4" />
            <span className="text-sm">Bekor / rad etilgan</span>
          </div>
          <p className="text-3xl font-bold">{stats?.cancelled_count ?? 0}</p>
        </div>
        <div className="rounded-xl border border-purple-500 bg-background p-5 space-y-2">
          <div className="flex items-center gap-2 text-purple-500">
            <Wallet className="h-4 w-4" />
            <span className="text-sm">Jami sarflagan</span>
          </div>
          <p className="text-2xl font-bold">{som(stats?.total_spent ?? 0)}</p>
          <p className="text-xs text-muted-foreground">Yetkazilgan buyurtmalar bo&apos;yicha</p>
        </div>
      </div>

      {/* Dates */}
      <div className="rounded-xl border border-slate-300 bg-background p-5 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-slate-500" /> Sanalar
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Ro&apos;yxatdan o&apos;tgan</p>
            <p className="font-medium">{formatDateTime(user.createdAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Oxirgi kirish</p>
            <p className="font-medium">{formatDateTime(user.last_login_at)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Birinchi buyurtma</p>
            <p className="font-medium">{formatDateTime(stats?.first_order_at)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Oxirgi buyurtma</p>
            <p className="font-medium">{formatDateTime(stats?.last_order_at)}</p>
          </div>
        </div>
      </div>

      {/* Order history */}
      <div className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-500" /> Buyurtmalar tarixi
        </h3>
        {orders.length === 0 ? (
          <div className="rounded-xl border bg-background p-8 text-center text-muted-foreground">
            Bu foydalanuvchi hali buyurtma bermagan
          </div>
        ) : (
          <div className={isPending ? "space-y-3 opacity-60" : "space-y-3"}>
            {orders.map((order) => (
              <OrderCard key={order._id} order={order} />
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2">
            <span className="text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1 || isPending}
              aria-label="Oldingi sahifa"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages || isPending}
              aria-label="Keyingi sahifa"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
