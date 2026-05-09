"use client"

import { useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Restaurant } from "@/lib/api/restaurants"
import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2 } from "lucide-react"

const columns: ColumnDef<Restaurant>[] = [
  {
    accessorKey: "name",
    header: "Nomi",
    cell: ({ row }) => {
      const name = row.getValue("name") as string
      return <span className="font-medium">{name}</span>
    },
  },
  {
    accessorKey: "phone",
    header: "Telefon",
  },
  {
    accessorKey: "city",
    header: "Shahar",
  },
  {
    accessorKey: "is_active",
    header: "Holati",
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") as boolean
      return (
        <Badge variant={isActive ? "secondary" : "destructive"} className={isActive ? "bg-green-100 text-green-800" : ""}>
          {isActive ? "Faol" : "Nofaol"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "is_open",
    header: "Ochiq/Yopiq",
    cell: ({ row }) => {
      const isOpen = row.getValue("is_open") as boolean
      return (
        <Badge variant="outline" className={isOpen ? "text-blue-600 border-blue-600" : "text-gray-500"}>
          {isOpen ? "Ochiq" : "Yopiq"}
        </Badge>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const restaurant = row.original
      return (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    },
  },
]

interface RestaurantsTableClientProps {
  initialData: Restaurant[]
  totalPages: number
  currentPage: number
}

export function RestaurantsTableClient({ initialData, totalPages, currentPage }: RestaurantsTableClientProps) {
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
        <h1 className="text-2xl font-medium tracking-tight">Restoranlar</h1>
        <Button className="font-medium py-5 bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Restoran qo'shish
        </Button>
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

