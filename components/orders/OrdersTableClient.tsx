"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Search, X, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { Order, ORDER_STATUSES } from "@/types"
import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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

const STATUS_FILTER = [
  { value: "all", label: "Barcha statuslar" },
  ...ORDER_STATUSES.map((s) => ({ value: s.value, label: s.label })),
] as const

function StatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUSES.find((o) => o.value === status)
  return (
    <Badge variant="outline" className={s?.color || ""}>
      {s?.label || status}
    </Badge>
  )
}

function ActionsCell({ order, onAction }: { order: Order; onAction: () => void }) {
  const [loading, setLoading] = useState(false)

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
    const result = await cancelOrderAction(order._id, "Admin tomonidan bekor qilindi")
    setLoading(false)
    if (result.success) {
      toast.success("Buyurtma bekor qilindi")
      onAction()
    } else {
      toast.error(result.error || "Xatolik")
    }
  }

  if (order.status === "delivered" || order.status === "rejected") return null

  const nextStatuses = {
    pending: [{ value: "accepted", label: "Qabul qilish" }],
    accepted: [{ value: "ready", label: "Tayyor" }],
    ready: [{ value: "on_way", label: "Yo'lga chiqdi" }],
    on_way: [{ value: "delivered", label: "Yetkazildi" }],
  } as Record<string, { value: string; label: string }[]>

  const available = nextStatuses[order.status] || []

  return (
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
        <DropdownMenuItem onClick={cancel} className="text-red-600">
          Bekor qilish
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface OrdersTableClientProps {
  initialData: Order[]
  totalPages: number
  currentPage: number
  filters: { search: string; status: string }
}

export function OrdersTableClient({
  initialData,
  totalPages,
  currentPage,
  filters,
}: OrdersTableClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(filters.search)
  const isFirstRender = useRef(true)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const hasActiveFilters = filters.search || filters.status

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
    debounceTimer.current = setTimeout(() => navigate({ order_number: search }), 500)
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const columns: ColumnDef<Order>[] = [
    {
      accessorKey: "order_number",
      header: "Buyurtma №",
      cell: ({ row }) => <span className="font-medium">{row.getValue("order_number")}</span>,
    },
    {
      accessorKey: "restaurant_id",
      header: "Restoran",
      cell: ({ row }) => {
        const r = row.original.restaurant_id
        return <span>{typeof r === "object" ? r?.name : "—"}</span>
      },
    },
    {
      accessorKey: "total",
      header: "Summa",
      cell: ({ row }) => <span>{Number(row.getValue("total")).toLocaleString()} so'm</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      accessorKey: "createdAt",
      header: "Sana",
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"))
        return <span className="text-muted-foreground text-sm">{date.toLocaleDateString("uz")} {date.toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" })}</span>
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <ActionsCell order={row.original} onAction={refreshData} />,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium tracking-tight">Buyurtmalar</h1>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buyurtma raqami..."
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

        {hasActiveFilters && (
          <Button variant="outline" size="lg" onClick={resetFilters}>
            <X className="h-4 w-4 mr-1" />
            Tozalash
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={initialData}
        pageCount={totalPages}
        currentPage={currentPage}
        onPageChange={(page) => navigate({ page: page.toString() })}
        isLoading={isPending}
      />
    </div>
  )
}
