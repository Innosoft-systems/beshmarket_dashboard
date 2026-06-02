"use client"

import { useCallback, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Search, X, CreditCard, Banknote, Wallet } from "lucide-react"
import { Payment } from "@/types"
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
import Link from "next/link"

const METHOD_CONFIG = {
  cash:  { label: "Naqd",  icon: Banknote,    cls: "bg-green-100 text-green-700 border-green-200" },
  payme: { label: "Payme", icon: CreditCard,   cls: "bg-blue-100 text-blue-700 border-blue-200" },
  click: { label: "Click", icon: Wallet,       cls: "bg-orange-100 text-orange-700 border-orange-200" },
} as const

const STATUS_CONFIG = {
  pending:  { label: "Kutilmoqda", cls: "bg-gray-100 text-gray-700 border-gray-200" },
  waiting:  { label: "Jarayonda",  cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  paid:     { label: "To'landi",   cls: "bg-green-100 text-green-700 border-green-200" },
  failed:   { label: "Xato",       cls: "bg-red-100 text-red-700 border-red-200" },
  cancelled:{ label: "Bekor",      cls: "bg-gray-100 text-gray-600 border-gray-200" },
  refunded: { label: "Qaytarildi", cls: "bg-purple-100 text-purple-700 border-purple-200" },
} as const

const METHOD_FILTER = [
  { value: "all", label: "Barcha usullar" },
  { value: "cash",  label: "Naqd" },
  { value: "payme", label: "Payme" },
  { value: "click", label: "Click" },
]

const STATUS_FILTER = [
  { value: "all", label: "Barcha statuslar" },
  { value: "paid",      label: "To'landi" },
  { value: "pending",   label: "Kutilmoqda" },
  { value: "waiting",   label: "Jarayonda" },
  { value: "failed",    label: "Xato" },
  { value: "cancelled", label: "Bekor" },
  { value: "refunded",  label: "Qaytarildi" },
]

const PERIOD_FILTER = [
  { value: "all",       label: "Barcha vaqt" },
  { value: "today",     label: "Bugun" },
  { value: "yesterday", label: "Kecha" },
  { value: "week",      label: "Hafta" },
  { value: "month",     label: "Oy" },
]

function MethodBadge({ method }: { method: string }) {
  const cfg = METHOD_CONFIG[method as keyof typeof METHOD_CONFIG]
  if (!cfg) return <Badge variant="outline">{method}</Badge>
  const Icon = cfg.icon
  return (
    <Badge variant="outline" className={`gap-1 ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
  return (
    <Badge variant="outline" className={cfg?.cls || ""}>
      {cfg?.label || status}
    </Badge>
  )
}

function formatAmount(tiyin: number) {
  return (tiyin / 100).toLocaleString("uz") + " so'm"
}

function getOrderNumber(order_id: Payment["order_id"]): { num: string; id: string } | null {
  if (!order_id || typeof order_id === "string") return null
  return { num: order_id.order_number, id: order_id._id }
}

function getUser(user_id: Payment["user_id"]): string {
  if (!user_id || typeof user_id === "string") return "—"
  return user_id.full_name || user_id.phone || "—"
}

const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: "transaction_id",
    header: "Tranzaksiya",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.transaction_id ? row.original.transaction_id.slice(-12) : "—"}
      </span>
    ),
  },
  {
    accessorKey: "order_id",
    header: "Buyurtma",
    cell: ({ row }) => {
      const o = getOrderNumber(row.original.order_id)
      return o ? (
        <Link href={`/orders/${o.id}`} className="text-primary hover:underline text-xs font-medium">
          #{o.num}
        </Link>
      ) : <span className="text-muted-foreground text-xs">—</span>
    },
  },
  {
    accessorKey: "user_id",
    header: "Mijoz",
    cell: ({ row }) => (
      <span className="text-xs">{getUser(row.original.user_id)}</span>
    ),
  },
  {
    accessorKey: "method",
    header: "Usul",
    cell: ({ row }) => <MethodBadge method={row.original.method} />,
  },
  {
    accessorKey: "amount",
    header: "Summa",
    cell: ({ row }) => (
      <span className="text-xs font-semibold">{formatAmount(row.original.amount)}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "paid_at",
    header: "Sana",
    cell: ({ row }) => {
      const d = new Date(row.original.paid_at || row.original.createdAt)
      return (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {d.toLocaleDateString("uz")} {d.toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )
    },
  },
]

interface Stats {
  total: number
  totalAmount: number
  paidCount: number
  paidAmount: number
}

interface Props {
  initialData: Payment[]
  totalPages: number
  currentPage: number
  filters: { method: string; status: string; period: string; search: string }
  stats: Stats
}

export function PaymentsTableClient({ initialData, totalPages, currentPage, filters, stats }: Props) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">To'lovlar</h1>
        <p className="text-muted-foreground text-sm mt-1">Barcha tranzaksiyalar tarixi</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-background p-4">
          <p className="text-xs text-muted-foreground">Jami to'lovlar</p>
          <p className="text-2xl font-bold mt-1">{stats.total.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <p className="text-xs text-muted-foreground">Jami summa</p>
          <p className="text-2xl font-bold mt-1">{(stats.totalAmount / 100).toLocaleString()} so'm</p>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <p className="text-xs text-muted-foreground">To'langan</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{stats.paidCount.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <p className="text-xs text-muted-foreground">To'langan summa</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{(stats.paidAmount / 100).toLocaleString()} so'm</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tranzaksiya ID..."
            className="pl-8 h-9 w-52 text-sm"
            defaultValue={filters.search}
            onChange={(e) => updateParam({ transaction_id: e.target.value })}
          />
        </div>

        <Select value={filters.method} onValueChange={(v) => updateParam({ method: v === "all" ? "" : (v ?? "") })}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue placeholder="Barcha usullar" />
          </SelectTrigger>
          <SelectContent>
            {METHOD_FILTER.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => updateParam({ status: v === "all" ? "" : (v ?? "") })}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue placeholder="Barcha statuslar" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.period} onValueChange={(v) => updateParam({ period: v === "all" ? "" : (v ?? "") })}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue placeholder="Barcha vaqt" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_FILTER.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filters.method || filters.status || filters.period || filters.search) && (
          <Button variant="ghost" size="sm" className="h-9 gap-1" onClick={() => router.push(pathname)}>
            <X className="h-4 w-4" /> Tozalash
          </Button>
        )}
      </div>

      {/* Table */}
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
