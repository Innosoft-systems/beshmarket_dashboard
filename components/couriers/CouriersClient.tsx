"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Search, Eye, Check, X as XIcon, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { CourierProfile, COURIER_STATUSES } from "@/types"
import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useCourierSocket } from "@/hooks/use-courier-socket"
import { CourierFormDialog } from "@/components/couriers/CourierFormDialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDebounce } from "@/hooks/use-debounce"

const STATUS_FILTER = [
  { value: "all", label: "Barcha holatlar" },
  ...COURIER_STATUSES.map((s) => ({ value: s.value, label: s.label })),
]

const ACTIVE_FILTER = [
  { value: "all", label: "Barchasi" },
  { value: "true", label: "Faol" },
  { value: "false", label: "Nofaol" },
]

function formatSum(n: number): string {
  if (!n) return "0 so'm"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mln so'm`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} ming so'm`
  return `${n.toLocaleString()} so'm`
}

interface Props {
  couriers: CourierProfile[]
  totalPages: number
  currentPage: number
  filters: { search: string; status: string; is_active: string }
  accessToken?: string
}

export function CouriersClient({ couriers, totalPages, currentPage, filters, accessToken }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(filters.search)
  const [statusFilter, setStatusFilter] = useState(filters.status || "all")
  const [activeFilter, setActiveFilter] = useState(filters.is_active || "all")
  const [formOpen, setFormOpen] = useState(false)
  const debouncedSearch = useDebounce(search, 400)

  useCourierSocket(accessToken || null)

  const navigate = (s: string, st: string, ac: string, p = 1) => {
    const params = new URLSearchParams()
    if (s) params.set("search", s)
    if (st !== "all") params.set("status", st)
    if (ac !== "all") params.set("is_active", ac)
    if (p > 1) params.set("page", String(p))
    startTransition(() => router.push(`/couriers?${params}`))
  }

  // Debounced search effect
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (debouncedSearch !== filters.search) {
      navigate(debouncedSearch, statusFilter, activeFilter)
    }
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const columns: ColumnDef<CourierProfile>[] = useMemo(() => [
    {
      accessorKey: "user_id",
      header: "Kuryer",
      cell: ({ row }) => {
        const user = row.original.user_id as any
        return (
          <div className="cursor-pointer" onClick={() => router.push(`/couriers/${row.original._id}`)}>
            <p className="font-medium text-primary hover:underline">{user?.full_name || "Noma'lum"}</p>
            <p className="text-xs text-muted-foreground">{user?.phone}</p>
          </div>
        )
      },
    },
    {
      accessorKey: "vehicle_type",
      header: "Transport",
      cell: ({ row }) => {
        const labels: Record<string, string> = { bicycle: "Velosiped", motorcycle: "Mototsikl", car: "Avtomobil", on_foot: "Piyoda" }
        return <span>{labels[row.getValue("vehicle_type") as string] || row.getValue("vehicle_type") as string}</span>
      },
    },
    { accessorKey: "city", header: "Shahar" },
    {
      accessorKey: "status",
      header: "Holat",
      cell: ({ row }) => {
        const s = COURIER_STATUSES.find((c) => c.value === row.getValue("status"))
        return <Badge variant="outline" className={s?.color || ""}>{s?.label || row.getValue("status") as string}</Badge>
      },
    },
    { accessorKey: "total_deliveries", header: "Yetkazishlar" },
    {
      accessorKey: "balance",
      header: "Balans",
      cell: ({ row }) => (
        <span className="text-sm">{formatSum(row.getValue("balance") as number)}</span>
      ),
    },
    {
      accessorKey: "is_verified",
      header: "Tasdiqlangan",
      cell: ({ row }) =>
        row.getValue("is_verified") ? (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200"><Check className="h-3 w-3 mr-1" />Ha</Badge>
        ) : (
          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200"><XIcon className="h-3 w-3 mr-1" />Yo'q</Badge>
        ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => router.push(`/couriers/${row.original._id}`)}>
          <Eye className="h-4 w-4 mr-1" />Batafsil
        </Button>
      ),
    },
  ], [router]) // eslint-disable-line react-hooks/exhaustive-deps

  const stats = {
    total: couriers.length,
    online: couriers.filter((c) => c.status === "online").length,
    busy: couriers.filter((c) => c.status === "busy").length,
    offline: couriers.filter((c) => c.status === "offline").length,
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Kuryerlar</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Kuryer qo'shish
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Jami", value: stats.total, color: "border-blue-500 text-blue-600" },
          { label: "Onlayn", value: stats.online, color: "border-green-500 text-green-600" },
          { label: "Band", value: stats.busy, color: "border-amber-500 text-amber-600" },
          { label: "Oflayn", value: stats.offline, color: "border-gray-400 text-gray-500" },
        ].map(s => (
          <div key={s.label} className={`rounded-lg border ${s.color} bg-background p-4`}>
            <p className="text-sm">{s.label}</p>
            <p className="text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ism yoki telefon..."
            value={search}
            className="pl-9"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { const val = v ?? "all"; setStatusFilter(val); navigate(debouncedSearch, val, activeFilter) }}>
          <SelectTrigger className="w-44"><SelectValue>{STATUS_FILTER.find(s => s.value === statusFilter)?.label}</SelectValue></SelectTrigger>
          <SelectContent>{STATUS_FILTER.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={(v) => { const val = v ?? "all"; setActiveFilter(val); navigate(debouncedSearch, statusFilter, val) }}>
          <SelectTrigger className="w-36"><SelectValue>{ACTIVE_FILTER.find(s => s.value === activeFilter)?.label}</SelectValue></SelectTrigger>
          <SelectContent>{ACTIVE_FILTER.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
        {(search || statusFilter !== "all" || activeFilter !== "all") && (
          <Button variant="outline" onClick={() => { setSearch(""); setStatusFilter("all"); setActiveFilter("all"); navigate("", "all", "all") }}>
            Tozalash
          </Button>
        )}
      </div>

      <DataTable columns={columns} data={couriers} pageCount={1} currentPage={1} onPageChange={() => {}} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{currentPage}-sahifa / {totalPages} ta</p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={currentPage <= 1 || isPending}
              onClick={() => navigate(debouncedSearch, statusFilter, activeFilter, currentPage - 1)}>
              <ChevronLeft className="h-4 w-4" /> Oldingi
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages || isPending}
              onClick={() => navigate(debouncedSearch, statusFilter, activeFilter, currentPage + 1)}>
              Keyingi <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <CourierFormDialog open={formOpen} onOpenChange={setFormOpen} onSuccess={() => router.refresh()} />
    </div>
  )
}
