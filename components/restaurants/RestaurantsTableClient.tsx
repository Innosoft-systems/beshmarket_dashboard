"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import { Search, X, MoreHorizontal, Plus, Pencil, Trash2, Power, ShoppingBag } from "lucide-react"
import { toast } from "sonner"
import { Restaurant } from "@/types"
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { RestaurantFormDialog } from "@/components/restaurants/RestaurantFormDialog"
import { deleteRestaurantAction, toggleRestaurantActiveAction, toggleRestaurantVisibilityAction } from "@/app/(dashboard)/restaurants/actions"

const STATUS_OPTIONS = [
  { value: "all", label: "Barcha holatlar" },
  { value: "true", label: "Faol" },
  { value: "false", label: "Nofaol" },
] as const

function ActionsCell({
  restaurant,
  onAction,
}: {
  restaurant: Restaurant
  onAction: () => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [actionType, setActionType] = useState<"delete" | "toggle" | "visibility" | null>(null)
  const [loading, setLoading] = useState(false)
  const isMarket = restaurant.type === "market"

  const handleConfirm = async () => {
    setLoading(true)
    let result
    if (actionType === "delete") {
      result = await deleteRestaurantAction(restaurant._id)
    } else if (actionType === "visibility") {
      result = await toggleRestaurantVisibilityAction(restaurant._id)
    } else {
      result = await toggleRestaurantActiveAction(restaurant._id)
    }

    setLoading(false)
    setConfirmOpen(false)

    if (result.success) {
      toast.success(
        actionType === "delete" ? "Restoran o'chirildi" :
        actionType === "visibility" ? "Market ko'rinishi o'zgartirildi" :
        "Holat o'zgartirildi"
      )
      onAction()
    } else {
      toast.error(result.error || "Xatolik yuz berdi")
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Amallar" />}>
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Tahrirlash
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={`/restaurants/${restaurant._id}/products`} />}>
            <ShoppingBag className="h-4 w-4 mr-2" />
            Mahsulotlar
          </DropdownMenuItem>
          {isMarket ? (
            <DropdownMenuItem onClick={() => { setActionType("visibility"); setConfirmOpen(true) }}>
              <Power className="h-4 w-4 mr-2 text-amber-600" />
              {restaurant.is_active ? "Mijozlardan yashirish" : "Mijozlarga ko'rsatish"}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => { setActionType("toggle"); setConfirmOpen(true) }}>
              <Power className="h-4 w-4 mr-2 text-amber-600" />
              {restaurant.is_active ? "Nofaol qilish" : "Faol qilish"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => { setActionType("delete"); setConfirmOpen(true) }} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            O'chirish
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RestaurantFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        restaurant={restaurant}
        onSuccess={onAction}
      />

      {actionType && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={
            actionType === "delete" ? "O'chirish" :
            actionType === "visibility" ? "Ko'rinishni o'zgartirish" :
            "Holatni o'zgartirish"
          }
          description={
            actionType === "delete"
              ? `"${restaurant.name}" ni o'chirishni xohlaysizmi?`
              : actionType === "visibility"
              ? `"${restaurant.name}" ni mijozlarga ${restaurant.is_active ? "yashirish" : "ko'rsatish"}ni xohlaysizmi?`
              : `"${restaurant.name}" ni ${restaurant.is_active ? "nofaol" : "faol"} qilishni xohlaysizmi?`
          }
          confirmLabel={actionType === "delete" ? "O'chirish" : "Tasdiqlash"}
          variant={actionType === "delete" ? "destructive" : "default"}
          loading={loading}
          onConfirm={handleConfirm}
        />
      )}
    </>
  )
}

interface RestaurantsTableClientProps {
  initialData: Restaurant[]
  totalPages: number
  currentPage: number
  filters?: { search: string; is_active: string }
}

export function RestaurantsTableClient({
  initialData,
  totalPages,
  currentPage,
  filters = { search: "", is_active: "" },
}: RestaurantsTableClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(filters.search)
  const [formOpen, setFormOpen] = useState(false)
  const isFirstRender = useRef(true)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasActiveFilters = filters.search || filters.is_active

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

  const refreshData = () => {
    startTransition(() => { router.refresh() })
  }

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => { navigate({ search }) }, 500)
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const columns: ColumnDef<Restaurant>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Nomi",
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "phone",
      header: "Telefon",
    },
    {
      accessorKey: "city",
      header: "Shahar",
      cell: ({ row }) => (
        <span>{row.original.city}, {row.original.district}</span>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Holati",
      cell: ({ row }) => {
        const active = row.getValue("is_active") as boolean
        const isMarket = row.original.type === "market"
        return (
          <Badge
            variant={active ? "secondary" : "destructive"}
            className={active ? "bg-green-100 text-green-700 border-green-200" : ""}
          >
            {isMarket ? (active ? "Ko'rinadi" : "Yashirin") : (active ? "Faol" : "Nofaol")}
          </Badge>
        )
      },
    },
    {
      accessorKey: "avg_rating",
      header: "Reyting",
      cell: ({ row }) => {
        const rating = row.getValue("avg_rating") as number
        return <span className="text-muted-foreground">{rating?.toFixed(1) || "—"}</span>
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ActionsCell restaurant={row.original} onAction={refreshData} />
      ),
    },
  ], [refreshData]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium tracking-tight">Restoranlar</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Yangi restoran
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-50 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Restoran nomi..."
            value={search}
            className="pl-9"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select
          value={filters.is_active || "all"}
          onValueChange={(value) => navigate({ is_active: value ?? "all" })}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue>
              {STATUS_OPTIONS.find((s) => s.value === (filters.is_active || "all"))?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
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

      <RestaurantFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={refreshData}
      />
    </div>
  )
}
