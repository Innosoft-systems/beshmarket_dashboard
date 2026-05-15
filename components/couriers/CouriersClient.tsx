"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Search, Eye, Check, X as XIcon, Plus } from "lucide-react"
import { CourierProfile, COURIER_STATUSES } from "@/types"
import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useCourierSocket } from "@/hooks/use-courier-socket"
import { CourierFormDialog } from "@/components/couriers/CourierFormDialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const STATUS_FILTER = [
  { value: "all", label: "Barcha holatlar" },
  ...COURIER_STATUSES.map((s) => ({ value: s.value, label: s.label })),
] as const

const ACTIVE_FILTER = [
  { value: "all", label: "Barchasi" },
  { value: "true", label: "Faol" },
  { value: "false", label: "Nofaol" },
] as const

function StatusBadge({ status }: { status: string }) {
  const s = COURIER_STATUSES.find((c) => c.value === status)
  return <Badge variant="outline" className={s?.color || ""}>{s?.label || status}</Badge>
}

interface CouriersClientProps {
  couriers: CourierProfile[]
  accessToken?: string
}

export function CouriersClient({ couriers, accessToken }: CouriersClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [activeFilter, setActiveFilter] = useState("all")
  const [formOpen, setFormOpen] = useState(false)

  useCourierSocket(accessToken || null)

  const refresh = () => router.refresh()

  const filtered = couriers.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false
    if (activeFilter !== "all" && String(c.is_active) !== activeFilter) return false
    if (search) {
      const name = c.user_id?.full_name?.toLowerCase() || ""
      const phone = c.user_id?.phone || ""
      if (!name.includes(search.toLowerCase()) && !phone.includes(search)) return false
    }
    return true
  })

  const stats = {
    total: couriers.length,
    online: couriers.filter((c) => c.status === "online").length,
    busy: couriers.filter((c) => c.status === "busy" || c.status === "on_delivery").length,
    offline: couriers.filter((c) => c.status === "offline").length,
  }

  const columns: ColumnDef<CourierProfile>[] = [
    {
      accessorKey: "user_id",
      header: "Kuryer",
      cell: ({ row }) => {
        const user = row.original.user_id
        return (
          <div
            className="cursor-pointer"
            onClick={() => router.push(`/couriers/${row.original._id}`)}
          >
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
        const type = row.getValue("vehicle_type") as string
        const labels: Record<string, string> = { bicycle: "Velosiped", motorcycle: "Mototsikl", car: "Avtomobil", on_foot: "Piyoda" }
        return <span>{labels[type] || type}</span>
      },
    },
    {
      accessorKey: "city",
      header: "Shahar",
    },
    {
      accessorKey: "status",
      header: "Holat",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      accessorKey: "total_deliveries",
      header: "Yetkazishlar",
    },
    {
      accessorKey: "avg_rating",
      header: "Reyting",
      cell: ({ row }) => {
        const rating = row.getValue("avg_rating") as number
        return <span>{rating ? rating.toFixed(1) : "—"}</span>
      },
    },
    {
      accessorKey: "balance",
      header: "Balans",
      cell: ({ row }) => <span>{Number(row.getValue("balance")).toLocaleString()}</span>,
    },
    {
      accessorKey: "is_verified",
      header: "Tasdiqlangan",
      cell: ({ row }) => {
        const verified = row.getValue("is_verified") as boolean
        return verified ? (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
            <Check className="h-3 w-3 mr-1" /> Tasdiqlangan
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
            <XIcon className="h-3 w-3 mr-1" /> Tasdiqlanmagan
          </Badge>
        )
      },
    },
    {
      accessorKey: "is_active",
      header: "Faol",
      cell: ({ row }) => {
        const active = row.getValue("is_active") as boolean
        return (
          <Badge variant="outline" className={active ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}>
            {active ? "Ha" : "Yo'q"}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => router.push(`/couriers/${row.original._id}`)}>
          <Eye className="h-4 w-4 mr-1" />
          Batafsil
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium tracking-tight">Kuryerlar</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Kuryer qo'shish
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-blue-500 bg-background p-4">
          <p className="text-sm text-blue-600">Jami</p>
          <p className="text-2xl font-semibold text-blue-600">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-green-500 bg-background p-4">
          <p className="text-sm text-green-600">Onlayn</p>
          <p className="text-2xl font-semibold text-green-600">{stats.online}</p>
        </div>
        <div className="rounded-lg border border-amber-500 bg-background p-4">
          <p className="text-sm text-amber-600">Band</p>
          <p className="text-2xl font-semibold text-amber-600">{stats.busy}</p>
        </div>
        <div className="rounded-lg border border-gray-400 bg-background p-4">
          <p className="text-sm text-gray-500">Oflayn</p>
          <p className="text-2xl font-semibold text-gray-500">{stats.offline}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ism yoki telefon..."
            value={search}
            className="pl-9"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue>{STATUS_FILTER.find((s) => s.value === statusFilter)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[130px]">
            <SelectValue>{ACTIVE_FILTER.find((s) => s.value === activeFilter)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ACTIVE_FILTER.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search || statusFilter !== "all" || activeFilter !== "all") && (
          <Button variant="outline" size="lg" onClick={() => { setSearch(""); setStatusFilter("all"); setActiveFilter("all") }}>
            Tozalash
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        pageCount={1}
        currentPage={1}
        onPageChange={() => {}}
      />

      <CourierFormDialog open={formOpen} onOpenChange={setFormOpen} onSuccess={refresh} />
    </div>
  )
}
