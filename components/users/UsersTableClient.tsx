"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Search, X } from "lucide-react"
import { User } from "@/lib/api/users"
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
    cell: ({ row }) => {
      const role = row.getValue("role") as string
      const label = ROLES.find((r) => r.value === role)?.label ?? role
      return <Badge variant="outline">{label}</Badge>
    },
  },
  {
    accessorKey: "is_blocked",
    header: "Holati",
    cell: ({ row }) => {
      const isBlocked = row.getValue("is_blocked") as boolean
      return (
        <Badge
          variant={isBlocked ? "destructive" : "secondary"}
          className={!isBlocked ? "bg-green-100 text-green-800" : ""}
        >
          {isBlocked ? "Bloklangan" : "Faol"}
        </Badge>
      )
    },
  },
]

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium tracking-tight">Foydalanuvchilar</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
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
          <SelectTrigger className="w-[160px]">
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
          <SelectTrigger className="w-[160px]">
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
          <Button variant="ghost" size="sm" onClick={resetFilters}>
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
