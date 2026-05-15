"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Search, X, MoreHorizontal, ShieldBan, ShieldCheck, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { User } from "@/types"
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
import { blockUserAction, unblockUserAction, deleteUserAction } from "@/app/(dashboard)/users/actions"

const ROLES = [
  { value: "all", label: "Barcha rollar" },
  { value: "admin", label: "Admin" },
  { value: "client", label: "Mijoz" },
  { value: "kuryer", label: "Kuryer" },
  { value: "restaurant", label: "Restoran" },
] as const

const STATUS_OPTIONS = [
  { value: "all", label: "Barcha holatlar" },
  { value: "false", label: "Faol" },
  { value: "true", label: "Bloklangan" },
] as const

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  client: "bg-blue-100 text-blue-700 border-blue-200",
  kuryer: "bg-amber-100 text-amber-700 border-amber-200",
  restaurant: "bg-emerald-100 text-emerald-700 border-emerald-200",
}

function RoleBadge({ role }: { role: string }) {
  const label = ROLES.find((r) => r.value === role)?.label ?? role
  return (
    <Badge variant="outline" className={ROLE_STYLES[role] || ""}>
      {label}
    </Badge>
  )
}

function ActionsCell({ user, onAction }: { user: User; onAction: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [actionType, setActionType] = useState<"block" | "unblock" | "delete" | null>(null)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    let result: { success: boolean; error?: string }

    if (actionType === "block") {
      result = await blockUserAction(user._id)
    } else if (actionType === "unblock") {
      result = await unblockUserAction(user._id)
    } else {
      result = await deleteUserAction(user._id)
    }

    setLoading(false)
    setConfirmOpen(false)

    if (result.success) {
      toast.success(
        actionType === "block" ? "Foydalanuvchi bloklandi" :
        actionType === "unblock" ? "Foydalanuvchi blokdan chiqarildi" :
        "Foydalanuvchi o'chirildi"
      )
      onAction()
    } else {
      toast.error(result.error || "Xatolik yuz berdi")
    }
  }

  const openConfirm = (type: "block" | "unblock" | "delete") => {
    setActionType(type)
    setConfirmOpen(true)
  }

  const confirmMessages = {
    block: { title: "Bloklash", description: `${user.full_name || user.phone} ni bloklashni xohlaysizmi?` },
    unblock: { title: "Blokdan chiqarish", description: `${user.full_name || user.phone} ni blokdan chiqarishni xohlaysizmi?` },
    delete: { title: "O'chirish", description: `${user.full_name || user.phone} ni butunlay o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.` },
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" />}
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {user.is_blocked ? (
            <DropdownMenuItem onClick={() => openConfirm("unblock")}>
              <ShieldCheck className="h-4 w-4 mr-2 text-green-600" />
              Blokdan chiqarish
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => openConfirm("block")}>
              <ShieldBan className="h-4 w-4 mr-2 text-orange-600" />
              Bloklash
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => openConfirm("delete")} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            O'chirish
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {actionType && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={confirmMessages[actionType].title}
          description={confirmMessages[actionType].description}
          confirmLabel={confirmMessages[actionType].title}
          variant={actionType === "unblock" ? "default" : "destructive"}
          loading={loading}
          onConfirm={handleConfirm}
        />
      )}
    </>
  )
}

interface UsersTableClientProps {
  initialData: User[]
  totalPages: number
  currentPage: number
  filters: { search: string; role: string; is_blocked: string }
}

export function UsersTableClient({
  initialData,
  totalPages,
  currentPage,
  filters,
}: UsersTableClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(filters.search)
  const isFirstRender = useRef(true)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const hasActiveFilters = filters.search || filters.role || filters.is_blocked

  const navigate = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== "all") params.set(key, value)
        else params.delete(key)
      })
      if (!("page" in updates)) params.delete("page")

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams, startTransition],
  )

  const resetFilters = () => {
    setSearch("")
    startTransition(() => {
      router.replace(pathname)
    })
  }

  const refreshData = () => {
    startTransition(() => {
      router.refresh()
    })
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    debounceTimer.current = setTimeout(() => {
      navigate({ search })
    }, 500)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "full_name",
      header: "F.I.SH",
      cell: ({ row }) => {
        const name = row.getValue("full_name") as string
        return name
          ? <span className="font-medium">{name}</span>
          : <span className="text-muted-foreground italic">Kiritilmagan</span>
      },
    },
    {
      accessorKey: "phone",
      header: "Telefon",
    },
    {
      accessorKey: "role",
      header: "Rol",
      cell: ({ row }) => <RoleBadge role={row.getValue("role")} />,
    },
    {
      accessorKey: "is_blocked",
      header: "Holati",
      cell: ({ row }) => {
        const isBlocked = row.getValue("is_blocked") as boolean
        return (
          <Badge
            variant={isBlocked ? "destructive" : "secondary"}
            className={!isBlocked ? "bg-green-100 text-green-700 border-green-200" : ""}
          >
            {isBlocked ? "Bloklangan" : "Faol"}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <ActionsCell user={row.original} onAction={refreshData} />,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium tracking-tight">Foydalanuvchilar</h1>
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

        <Select
          value={filters.role || "all"}
          onValueChange={(value) => navigate({ role: value ?? "all" })}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue>
              {ROLES.find((r) => r.value === (filters.role || "all"))?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.is_blocked || "all"}
          onValueChange={(value) => navigate({ is_blocked: value ?? "all" })}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue>
              {STATUS_OPTIONS.find((s) => s.value === (filters.is_blocked || "all"))?.label}
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
    </div>
  )
}
