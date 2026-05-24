"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Search, X, MoreHorizontal, Layers } from "lucide-react"
import { toast } from "sonner"
import { Order, OrderRow, GroupedOrderRow, ORDER_STATUSES } from "@/types"
import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { OrderTimer } from "@/components/orders/OrderTimer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { updateOrderStatusAction, cancelOrderAction } from "@/lib/actions/orders"
import { useOrderSocket, NewOrderPayload, StatusUpdatedPayload } from "@/hooks/use-order-socket"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

const STATUS_FILTER = [
  { value: "all", label: "Barcha statuslar" },
  ...ORDER_STATUSES.map((s) => ({ value: s.value, label: s.label })),
] as const

const PERIOD_FILTER = [
  { value: "all", label: "Barcha vaqt" },
  { value: "today", label: "Bugun" },
  { value: "yesterday", label: "Kecha" },
  { value: "week", label: "Hafta" },
  { value: "month", label: "Oy" },
] as const

function StatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUSES.find((o) => o.value === status)
  return (
    <Badge variant="outline" className={s?.color || ""}>
      {s?.label || status}
    </Badge>
  )
}

function ActionsCell({ order, onAction, scope = "admin" }: { order: Order; onAction: () => void; scope?: "admin" | "restaurant" }) {
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const changeStatus = async (status: string) => {
    setLoading(true)
    const result = await updateOrderStatusAction(order._id, status)
    setLoading(false)
    if (result.success) {
      toast.success("Status yangilandi")
      onAction()
    } else {
      toast.error(result.error || "Xatolik")
    }
  }

  const cancel = async () => {
    setLoading(true)
    const reason = scope === "restaurant" ? "Restoran tomonidan bekor qilindi" : "Admin tomonidan bekor qilindi"
    const result = await cancelOrderAction(order._id, reason)
    setLoading(false)
    if (result.success) {
      toast.success("Buyurtma bekor qilindi")
      setConfirmOpen(false)
      onAction()
    } else {
      toast.error(result.error || "Xatolik")
    }
  }

  if (order.status === "delivered" || order.status === "rejected") return null

  const nextStatuses = scope === "restaurant"
    ? {
        pending: [
          { value: "accepted", label: "Qabul qilish" },
          { value: "rejected", label: "Rad etish" },
        ],
        accepted: [{ value: "ready", label: "Tayyor" }],
      }
    : {
        pending: [{ value: "accepted", label: "Qabul qilish" }],
        accepted: [{ value: "ready", label: "Tayyor" }],
        ready: [{ value: "on_way", label: "Yo'lga chiqdi" }],
        on_way: [{ value: "delivered", label: "Yetkazildi" }],
      } as Record<string, { value: string; label: string }[]>

  const available = nextStatuses[order.status] || []

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Buyurtmani bekor qilish"
        description={`#${order.order_number} buyurtmani bekor qilmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`}
        confirmLabel="Bekor qilish"
        loading={loading}
        onConfirm={cancel}
      />
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" disabled={loading} />}>
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {available.map((s) => (
            <DropdownMenuItem key={s.value} onClick={() => changeStatus(s.value)}>
              {s.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => setConfirmOpen(true)} className="text-red-600">
            Bekor qilish
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

// Merge orders by group_id — grouped orders appear as one row
function buildDisplayRows(orders: Order[]): OrderRow[] {
  const groupMap = new Map<string, Order[]>()
  const result: OrderRow[] = []
  const addedGroups = new Set<string>()

  for (const order of orders) {
    if (order.group_id) {
      const existing = groupMap.get(order.group_id) ?? []
      groupMap.set(order.group_id, [...existing, order])
    }
  }

  for (const order of orders) {
    if (!order.group_id) {
      result.push(order)
      continue
    }
    if (addedGroups.has(order.group_id)) continue
    addedGroups.add(order.group_id)

    const group = groupMap.get(order.group_id)!
    const restaurantNames = group
      .map((o) => (typeof o.restaurant_id === "object" ? o.restaurant_id?.name : null))
      .filter(Boolean)
      .join(" + ")
    const worstStatus = group.some((o) => o.status === "pending")
      ? "pending"
      : group.some((o) => o.status === "accepted")
      ? "accepted"
      : group[0].status

    const grouped: GroupedOrderRow = {
      _isGroup: true,
      group_id: order.group_id,
      orders: group,
      _id: group[0]._id,
      order_number: group.map((o) => o.order_number).join(" + "),
      restaurantNames,
      total: group.reduce((s, o) => s + o.total, 0),
      status: worstStatus,
      createdAt: group[0].createdAt,
    }
    result.push(grouped)
  }

  return result
}

interface OrdersTableClientProps {
  initialData: Order[]
  totalPages: number
  currentPage: number
  filters: { search: string; status: string; period: string }
  accessToken?: string
  stats?: { todayOrders: number; totalOrders: number; pendingOrders?: number; onwayOrders?: number }
  scope?: "admin" | "restaurant"
}

export function OrdersTableClient({
  initialData,
  totalPages,
  currentPage,
  filters,
  accessToken,
  stats: initialStats,
  scope = "admin",
}: OrdersTableClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(filters.search)
  const [orders, setOrders] = useState<Order[]>(initialData)
  const [stats, setStats] = useState(initialStats)
  const isFirstRender = useRef(true)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Sync when server re-renders with new initialData
  useEffect(() => { setOrders(initialData) }, [initialData])
  useEffect(() => { setStats(initialStats) }, [initialStats])

  const handleNewOrder = useCallback((payload: NewOrderPayload) => {
    const newOrder: Order = {
      _id: payload.orderId,
      order_number: payload.orderNumber,
      restaurant_id: { name: payload.restaurantName },
      client_id: null,
      items: [],
      status: "pending",
      payment_status: "unpaid",
      subtotal: payload.total,
      delivery_fee: 0,
      service_fee: 0,
      discount: 0,
      total: payload.total,
      createdAt: new Date().toISOString(),
      group_id: payload.groupId,
    }
    setOrders((prev) => {
      // If this order already exists (e.g. from server re-render), don't duplicate
      if (prev.some((o) => o._id === payload.orderId)) return prev
      return [newOrder, ...prev]
    })
    setStats((prev) => prev
      ? { ...prev, todayOrders: prev.todayOrders + 1, totalOrders: prev.totalOrders + 1, pendingOrders: (prev.pendingOrders ?? 0) + 1 }
      : prev
    )
  }, [])

  const handleStatusUpdated = useCallback((payload: StatusUpdatedPayload) => {
    setOrders((prev) =>
      prev.map((o) => o._id === payload.orderId ? { ...o, status: payload.status } : o)
    )
  }, [])

  useOrderSocket(scope === "admin" ? (accessToken || null) : null, {
    onNewOrder: handleNewOrder,
    onStatusUpdated: handleStatusUpdated,
  })

  const hasActiveFilters = filters.search || filters.status || filters.period

  const navigate = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== "all") params.set(key, value)
        else params.delete(key)
      })
      if (!("page" in updates)) params.delete("page")
      startTransition(() => { router.replace(`${pathname}?${params.toString()}`) })
    },
    [router, pathname, searchParams, startTransition],
  )

  const resetFilters = () => {
    setSearch("")
    startTransition(() => { router.replace(pathname) })
  }

  const refreshData = () => startTransition(() => router.refresh())

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => navigate({ search }), 500)
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const displayRows = useMemo(() => buildDisplayRows(orders), [orders])

  const columns: ColumnDef<OrderRow>[] = [
    {
      accessorKey: "order_number",
      header: "Buyurtma №",
      cell: ({ row }) => {
        const r = row.original
        if (r._isGroup) {
          return (
            <div className="flex flex-col gap-0.5">
              {r.orders.map((o) => (
                <span
                  key={o._id}
                  className="font-medium text-primary cursor-pointer hover:underline text-sm"
                  onClick={() => router.push(`/orders/${o._id}`)}
                >
                  {o.order_number}
                </span>
              ))}
            </div>
          )
        }
        return (
          <span
            className="font-medium text-primary cursor-pointer hover:underline"
            onClick={() => router.push(`${scope === "restaurant" ? "/restaurant/orders" : "/orders"}/${r._id}`)}
          >
            {r.order_number}
          </span>
        )
      },
    },
    ...(scope === "admin"
      ? [{
          accessorKey: "restaurant_id",
          header: "Restoran",
          cell: ({ row }: any) => {
            const r = row.original as OrderRow
            if (r._isGroup) {
              return (
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm">{r.restaurantNames}</span>
                </div>
              )
            }
            const rest = r.restaurant_id
            return <span>{typeof rest === "object" ? rest?.name : "—"}</span>
          },
        } as ColumnDef<OrderRow>]
      : []),
    {
      accessorKey: "total",
      header: "Summa",
      cell: ({ row }) => {
        const r = row.original
        return (
          <span className={r._isGroup ? "font-medium" : ""}>
            {Number(r.total).toLocaleString()} so'm
          </span>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const r = row.original
        if (r._isGroup) {
          return (
            <div className="flex flex-col gap-0.5">
              {r.orders.map((o) => (
                <StatusBadge key={o._id} status={o.status} />
              ))}
            </div>
          )
        }
        return <StatusBadge status={r.status} />
      },
    },
    {
      accessorKey: "createdAt",
      header: "Vaqt",
      cell: ({ row }) => {
        const r = row.original
        const status = r._isGroup ? r.orders[0].status : r.status
        const createdAt = r.createdAt
        if (!r._isGroup && (status === "pending" || status === "accepted")) {
          return <OrderTimer createdAt={createdAt} />
        }
        const date = new Date(createdAt)
        return (
          <span className="text-muted-foreground text-sm">
            {date.toLocaleDateString("uz")} {date.toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const r = row.original
        if (r._isGroup) {
          // Show actions for first non-delivered order in group
          const actionOrder = r.orders.find((o) => o.status !== "delivered" && o.status !== "rejected")
          if (!actionOrder) return null
          return <ActionsCell order={actionOrder} onAction={refreshData} scope={scope} />
        }
        return <ActionsCell order={r as Order} onAction={refreshData} scope={scope} />
      },
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium tracking-tight">Buyurtmalar</h1>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm text-muted-foreground">Bugungi buyurtmalar</p>
            <p className="text-2xl font-semibold">{stats.todayOrders}</p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm text-muted-foreground">Jami buyurtmalar</p>
            <p className="text-2xl font-semibold">{stats.totalOrders}</p>
          </div>
          <div className="rounded-lg border border-amber-400 bg-background p-4">
            <p className="text-sm text-amber-600">Kutilmoqda</p>
            <p className="text-2xl font-semibold text-amber-600">{stats.pendingOrders ?? 0}</p>
          </div>
          <div className="rounded-lg border border-cyan-400 bg-background p-4">
            <p className="text-sm text-cyan-600">Yo'lda</p>
            <p className="text-2xl font-semibold text-cyan-600">{stats.onwayOrders ?? 0}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buyurtma raqami yoki restoran..."
            value={search}
            className="pl-9"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select
          value={filters.status || "all"}
          onValueChange={(value) => navigate({ status: value ?? "all" })}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue>
              {STATUS_FILTER.find((s) => s.value === (filters.status || "all"))?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.period || "all"}
          onValueChange={(value) => navigate({ period: value ?? "all" })}
        >
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue>
              {PERIOD_FILTER.find((p) => p.value === (filters.period || "all"))?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PERIOD_FILTER.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="outline" size="lg" onClick={resetFilters}>
            <X className="h-4 w-4 mr-1" />
            Tozalash
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={displayRows}
        pageCount={totalPages}
        currentPage={currentPage}
        onPageChange={(page) => navigate({ page: page.toString() })}
        isLoading={isPending}
      />
    </div>
  )
}
