"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Power, FolderPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ProductFormDialog } from "./ProductFormDialog"
import { deleteProductAction, updateProductAction, createMenuCategoryAction, deleteMenuCategoryAction } from "@/lib/actions/products"

interface Props {
  restaurant: any
  products: any[]
  categories: any[]
}

export function ProductsClient({ restaurant, products, categories }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formOpen, setFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [deleteId, setDeleteId] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [newCatName, setNewCatName] = useState("")
  const [addingCat, setAddingCat] = useState(false)

  const filtered = selectedCategory === "all"
    ? products
    : products.filter(p => {
        const catId = p.menu_category_id?._id || p.menu_category_id
        return catId === selectedCategory
      })

  const toggleActive = async (p: any) => {
    const r = await updateProductAction(p._id, { is_active: !p.is_active })
    r.success ? startTransition(() => router.refresh()) : toast.error(r.error)
  }

  const addCategory = async () => {
    if (!newCatName.trim()) return
    setAddingCat(true)
    const r = await createMenuCategoryAction({
      restaurant_id: restaurant._id,
      name_uz: newCatName,
      name_ru: newCatName,
      name_en: newCatName,
    })
    setAddingCat(false)
    if (r.success) { toast.success("Kategoriya qo'shildi"); setNewCatName(""); startTransition(() => router.refresh()) }
    else toast.error(r.error)
  }

  return (
    <div className="space-y-5">
      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap items-center">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selectedCategory === "all" ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-muted"}`}
        >
          Hammasi ({products.length})
        </button>
        {categories.map(cat => (
          <div key={cat._id} className="flex items-center gap-1">
            <button
              onClick={() => setSelectedCategory(cat._id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selectedCategory === cat._id ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-muted"}`}
            >
              {cat.name_uz} ({products.filter(p => (p.menu_category_id?._id || p.menu_category_id) === cat._id).length})
            </button>
            <button
              onClick={async () => {
                const r = await deleteMenuCategoryAction(cat._id)
                r.success ? startTransition(() => router.refresh()) : toast.error(r.error)
              }}
              className="text-muted-foreground hover:text-red-500 p-0.5"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Add category inline */}
        <div className="flex items-center gap-1 ml-2">
          <Input
            placeholder="Yangi kategoriya..."
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCategory()}
            className="h-8 w-40 text-sm"
          />
          <Button size="sm" variant="outline" disabled={addingCat || !newCatName.trim()} onClick={addCategory}>
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Button size="sm" className="ml-auto" onClick={() => { setEditProduct(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Mahsulot qo'shish
        </Button>
      </div>

      {/* Products grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border py-16 text-center text-muted-foreground">Mahsulotlar yo'q</div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="h-11 px-4 text-left font-medium">Rasm</th>
                <th className="h-11 px-4 text-left font-medium">Nomi</th>
                <th className="h-11 px-4 text-left font-medium">Kategoriya</th>
                <th className="h-11 px-4 text-right font-medium">Narx</th>
                <th className="h-11 px-4 text-right font-medium">Buyurtmalar</th>
                <th className="h-11 px-4 text-center font-medium">Status</th>
                <th className="h-11 px-4 text-right font-medium">Amal</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: any) => {
                const catId = p.menu_category_id?._id || p.menu_category_id
                const cat = categories.find(c => c._id === catId)
                return (
                  <tr key={p._id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2">
                      {p.images?.[0]
                        ? <img src={p.images[0]} alt="" className="h-12 w-12 rounded-lg object-cover" />
                        : <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs">Rasm</div>
                      }
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{p.name_uz}</div>
                      <div className="text-xs text-muted-foreground">{p.name_ru}</div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">{cat?.name_uz || "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="font-medium">{p.price?.toLocaleString()} so'm</div>
                      {p.discount_price && <div className="text-xs text-green-600">{p.discount_price?.toLocaleString()} so'm</div>}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{p.order_count || 0}</td>
                    <td className="px-4 py-2 text-center">
                      <Badge variant="outline" className={p.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-600"}>
                        {p.is_active ? "Faol" : "Nofaol"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" disabled={isPending} onClick={() => { setEditProduct(p); setFormOpen(true) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" disabled={isPending} onClick={() => toggleActive(p)}>
                          <Power className={`h-3.5 w-3.5 ${p.is_active ? "text-green-600" : "text-gray-400"}`} />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500" disabled={isPending} onClick={() => setDeleteId(p._id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <ProductFormDialog
          product={editProduct}
          restaurantId={restaurant._id}
          categories={categories}
          onClose={() => { setFormOpen(false); setEditProduct(null) }}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={open => { if (!open) setDeleteId("") }}
        title="Mahsulotni o'chirish"
        description="Bu mahsulot o'chiriladi."
        confirmLabel="O'chirish"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={async () => {
          setDeleteLoading(true)
          const r = await deleteProductAction(deleteId)
          setDeleteLoading(false)
          setDeleteId("")
          r.success ? (toast.success("O'chirildi"), startTransition(() => router.refresh()))
            : toast.error(r.error)
        }}
      />
    </div>
  )
}
