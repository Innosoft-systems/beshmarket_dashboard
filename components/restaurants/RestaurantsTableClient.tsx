"use client"

import { useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Restaurant } from "@/lib/api/restaurants"
import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { RestaurantForm, RestaurantFormValues } from "./RestaurantForm"
import { createRestaurantAction, updateRestaurantAction, deleteRestaurantAction } from "@/app/(dashboard)/restaurants/actions"
import { toast } from "sonner"

interface RestaurantsTableClientProps {
  initialData: Restaurant[]
  totalPages: number
  currentPage: number
  accessToken: string
}

export function RestaurantsTableClient({ initialData, totalPages, currentPage, accessToken }: RestaurantsTableClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | undefined>()

  // Delete states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const handleAdd = () => {
    setEditingRestaurant(undefined)
    setIsFormOpen(true)
  }

  const handleEdit = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant)
    setIsFormOpen(true)
  }

  const handleDeleteClick = (id: string) => {
    setDeletingId(id)
    setIsDeleteOpen(true)
  }

  const onSubmitForm = async (values: RestaurantFormValues) => {
    let result;
    if (editingRestaurant) {
      result = await updateRestaurantAction(editingRestaurant._id, values)
    } else {
      result = await createRestaurantAction(values)
    }

    if (result.success) {
      toast.success(editingRestaurant ? "Restoran muvaffaqiyatli yangilandi!" : "Restoran muvaffaqiyatli qo'shildi!")
      setIsFormOpen(false)
    } else {
      toast.error(result.error)
    }
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    const result = await deleteRestaurantAction(deletingId)
    setIsDeleting(false)

    if (result.success) {
      toast.success("Restoran o'chirildi")
      setIsDeleteOpen(false)
      setDeletingId(null)
    } else {
      toast.error(result.error)
    }
  }

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
            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleEdit(restaurant)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteClick(restaurant._id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium tracking-tight">Restoranlar</h1>
        <Button onClick={handleAdd} className="font-medium py-5 bg-primary hover:bg-primary/90 text-primary-foreground">
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

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRestaurant ? "Restoranni tahrirlash" : "Yangi restoran qo'shish"}</DialogTitle>
            <DialogDescription>
              {editingRestaurant ? "Restoran ma'lumotlarini o'zgartirib saqlang." : "Yangi restoran ma'lumotlarini kiriting."}
            </DialogDescription>
          </DialogHeader>
          <RestaurantForm 
            initialData={editingRestaurant} 
            onSubmit={onSubmitForm} 
            onCancel={() => setIsFormOpen(false)} 
            accessToken={accessToken}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tasdiqlaysizmi?</DialogTitle>
            <DialogDescription>
              Siz rostdan ham ushbu restoranni o'chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
              Bekor qilish
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? "O'chirilmoqda..." : "Ha, o'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

