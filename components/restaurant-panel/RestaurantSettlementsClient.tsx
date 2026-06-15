"use client"

import { useCallback, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { X } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function formatAmount(tiyin: number) {
  return (tiyin / 100).toLocaleString("uz-UZ") + " so'm"
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".")
}

function formatPeriod(start: string, end: string) {
  return `${formatDate(start)} – ${formatDate(end)}`
}

const STATUS_CONFIG = {
  pending: { label: "Kutilmoqda", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  paid: { label: "To'landi", cls: "bg-green-100 text-green-700 border-green-200" },
} as const

const STATUS_FILTER = [
  { value: "pending", label: "Kutilmoqda" },
  { value: "paid", label: "To'langan" },
]

interface Stats {
  total: number
  pendingCount: number
  pendingPayoutTotal: number
  paidCount: number
  paidPayoutTotal: number
}

interface Props {
  initialData: any[]
  totalPages: number
  currentPage: number
  filters: { status: string }
  stats: Stats
}

export function RestaurantSettlementsClient({ initialData, totalPages, currentPage, filters, stats }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const updateParam = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([k, v]) => {
        if (!v || v === "all") params.delete(k)
        else params.set(k, v)
      })
      params.delete("page")
      startTransition(() => router.push(`${pathname}?${params.toString()}`))
    },
    [pathname, router, searchParams],
  )

  const goPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", p.toString())
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  const columns: ColumnDef<any>[] = [
    {
      id: "period",
      header: "Davr",
      cell: ({ row }) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {formatPeriod(row.original.period_start, row.original.period_end)}
        </span>
      ),
    },
    {
      accessorKey: "orders_count",
      header: "Buyurtmalar",
      cell: ({ row }) => <span className="text-sm">{row.original.orders_count} ta</span>,
    },
    {
      accessorKey: "total_orders_amount",
      header: "Jami summa",
      cell: ({ row }) => <span className="text-xs">{formatAmount(row.original.total_orders_amount)}</span>,
    },
    {
      accessorKey: "commission_amount",
      header: "Komissiya",
      cell: ({ row }) => (
        <span className="text-xs text-red-600">−{formatAmount(row.original.commission_amount)}</span>
      ),
    },
    {
      accessorKey: "payout_amount",
      header: "To'lov",
      cell: ({ row }) => (
        <span className="text-sm font-bold text-green-600">{formatAmount(row.original.payout_amount)}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const cfg = STATUS_CONFIG[row.original.status as keyof typeof STATUS_CONFIG]
        return (
          <Badge variant="outline" className={cfg?.cls || ""}>
            {cfg?.label || row.original.status}
          </Badge>
        )
      },
    },
    {
      id: "paid_at",
      header: "To'langan sana",
      cell: ({ row }) =>
        row.original.paid_at ? (
          <span className="text-xs text-muted-foreground">{formatDate(row.original.paid_at)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ]

  const hasFilters = !!filters.status

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hisob-kitoblar</h1>
        <p className="text-muted-foreground text-sm mt-1">To'lovlar va komissiya tarixi</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-background p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Jami</p>
          <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-yellow-500 bg-background p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Kutilayotgan</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pendingCount.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{formatAmount(stats.pendingPayoutTotal)}</p>
        </div>
        <div className="rounded-xl border border-green-500 bg-background p-4 space-y-1">
          <p className="text-xs text-muted-foreground">To'langan</p>
          <p className="text-2xl font-bold text-green-600">{stats.paidCount.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{formatAmount(stats.paidPayoutTotal)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filters.status || ""} onValueChange={(v) => updateParam({ status: v ?? "" })}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="Barcha statuslar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Barcha statuslar</SelectItem>
            {STATUS_FILTER.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9 gap-1" onClick={() => router.push(pathname)}>
            <X className="h-4 w-4" /> Tozalash
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={initialData}
        pageCount={totalPages}
        currentPage={currentPage}
        onPageChange={goPage}
      />
    </div>
  )
}
