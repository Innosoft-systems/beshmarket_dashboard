"use client"

import { useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { User } from "@/lib/api/users"
import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"

const columns: ColumnDef<User>[] = [
  {
    accessorKey: "full_name",
    header: "F.I.SH",
    cell: ({ row }) => {
      const name = row.getValue("full_name") as string
      return name ? <span className="font-medium">{name}</span> : <span className="text-muted-foreground italic">Kiritilmagan</span>
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
      return <Badge variant="outline">{role}</Badge>
    },
  },
  {
    accessorKey: "is_blocked",
    header: "Holati",
    cell: ({ row }) => {
      const isBlocked = row.getValue("is_blocked") as boolean
      return (
        <Badge variant={isBlocked ? "destructive" : "secondary"} className={!isBlocked ? "bg-green-100 text-green-800" : ""}>
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
}

export function UsersTableClient({ initialData, totalPages, currentPage }: UsersTableClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium tracking-tight">Foydalanuvchilar</h1>
      </div>
      <DataTable
        columns={columns}
        data={initialData}
        pageCount={totalPages}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        isLoading={isPending}
      />
    </div>
  )
}
