"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Power, FolderPlus, PackageX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getFullImgUrl } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ProductFormDialog } from "./ProductFormDialog"
import { deleteProductAction, updateProductAction, createMenuCategoryAction, deleteMenuCategoryAction } from "@/lib/actions/products"
import {
  createMyMenuCategoryAction,
  deleteMyMenuCategoryAction,
  deleteMyProductAction,
  updateMyProductAction,
} from "@/lib/actions/restaurant-panel"

interface Props {
  restaurant: any
  products: any[]
  categories: any[]
  scope?: "admin" | "restaurant"
}

export function ProductsClient({ restaurant, products, categories, scope = "admin" }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formOpen, setFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [deleteId, setDeleteId] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [newCatName, setNewCatName] = useState("")
  const [addingCat, setAddingCat] = useState(false)
  const [deleteCatId, setDeleteCatId] = useState("")
  const [deleteCatLoading, setDeleteCatLoading] = useState(false)

  const filtered = selectedCategory === "all"
    ? products
    : products.filter(p => {
        const catId = p.menu_category_id?._id || p.menu_category_id
        return catId === selectedCategory
      })

  const categoryOptions = [
    { value: "all", label: `Hammasi (${products.length})` },
    ...categories.map(cat => ({
      value: cat._id,
      label: `${cat.name_uz} (${products.filter(p => (p.menu_category_id?._id || p.menu_category_id) === cat._id).length})`,
    })),
  ]

  const selectedLabel = categoryOptions.find(o => o.value === selectedCategory)?.label

  const toggleActive = async (p: any) => {
    const r = scope === "restaurant"
      ? await updateMyProductAction(p._id, { is_active: !p.is_active })
      : await updateProductAction(p._id, { is_active: !p.is_active })
    r.success ? startTransition(() => router.refresh()) : toast.error(r.error)
  }

  const toggleAvailable = async (p: any) => {
    const r = scope === "restaurant"
      ? await updateMyProductAction(p._id, { is_available: !p.is_available })
      : await updateProductAction(p._id, { is_available: !p.is_available })
    r.success ? startTransition(() => router.refresh()) : toast.error(r.error)
  }

  const addCategory = async () => {
    if (!newCatName.trim()) return
    setAddingCat(true)
    const action = scope === "restaurant" ? createMyMenuCategoryAction : createMenuCategoryAction
    const r = await action({
      restaurant_id: restaurant._id,
      name_uz: newCatName,
      name_ru: newCatName,
      name_en: newCatName,
    })
    setAddingCat(false)
    if (r.success) { toast.success("Kategoriya qo'shildi"); setNewCatName(""); startTransition(() => router.refresh()) }
    else toast.error(r.error)
  }

  const deleteCategory = async () => {
    if (!deleteCatId) return
    setDeleteCatLoading(true)
    const r = scope === "restaurant"
      ? await deleteMyMenuCategoryAction(deleteCatId)
      : await deleteMenuCategoryAction(deleteCatId)
    setDeleteCatLoading(false)
    setDeleteCatId("")
    if (r.success) {
      toast.success("Kategoriya o'chirildi")
      setSelectedCategory("all")
      startTransition(() => router.refresh())
    } else {
      toast.error(r.error)
    }
  }

  return (
    <div className="space-y-5">
      {/* Filters and actions */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value ?? "all")}>
          <SelectTrigger className="w-full sm:w-55">
            <SelectValue>{selectedLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedCategory !== "all" && (
          <Button
            variant="outline"
            size="lg"
            className="text-red-500 hover:text-red-600"
            onClick={() => setDeleteCatId(selectedCategory)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Kategoriyani o'chirish
          </Button>
        )}

        <div className="flex items-center gap-1">
          <Input
            placeholder="Yangi kategoriya..."
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCategory()}
            className="h-9 w-full sm:w-48"
          />
          <Button size="sm" variant="outline" disabled={addingCat || !newCatName.trim()} onClick={addCategory}>
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>

        <Button className="sm:ml-auto" onClick={() => { setEditProduct(null); setFormOpen(true) }}>
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
                <th className="h-11 px-4 text-center font-medium">Variantlar</th>
                <th className="h-11 px-4 text-right font-medium">Buyurtmalar</th>
                <th className="h-11 px-4 text-center font-medium">Status</th>
                <th className="h-11 px-4 text-center font-medium">Mavjud</th>
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
                        ? <img src={getFullImgUrl(p.images[0])} alt="" className="h-12 w-12 rounded-lg object-cover" />
                        : <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs">Rasm</div>
                      }
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{p.name_uz}</div>
                      <div className="text-xs text-muted-foreground">{p.name_ru}</div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">{cat?.name_uz || "—"}</td>
                    <td className="px-4 py-2 text-right">
                      {p.variants?.length > 0 ? (() => {
                        const prices = p.variants.map((v: any) => v.discount_price || v.price).filter(Boolean)
                        const min = Math.min(...prices)
                        const max = Math.max(...prices)
                        return (
                          <div className="font-medium text-xs">
                            {min === max ? `${min.toLocaleString()}` : `${min.toLocaleString()} – ${max.toLocaleString()}`}
                            <span className="text-muted-foreground ml-1">so'm</span>
                          </div>
                        )
                      })() : (
                        <>
                          <div className="font-medium">{p.price?.toLocaleString()} so'm</div>
                          {p.discount_price && <div className="text-xs text-green-600">{p.discount_price?.toLocaleString()} so'm</div>}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {p.variants?.length > 0
                        ? <span className="text-xs font-medium text-blue-600">{p.variants.length} ta</span>
                        : <span className="text-xs text-muted-foreground">—</span>
                      }
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{p.order_count || 0}</td>
                    <td className="px-4 py-2 text-center">
                      <Badge variant="outline" className={p.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-600"}>
                        {p.is_active ? "Faol" : "Nofaol"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        disabled={isPending}
                        onClick={() => toggleAvailable(p)}
                        title={p.is_available ? "Mavjud — bosib \"Qolmadi\" deb belgilang" : "Qolmadi — bosib mavjud deb belgilang"}
                      >
                        <Badge variant="outline" className={p.is_available !== false ? "bg-blue-50 text-blue-700 border-blue-200 cursor-pointer hover:bg-blue-100" : "bg-orange-100 text-orange-700 border-orange-200 cursor-pointer hover:bg-orange-200"}>
                          {p.is_available !== false ? "Mavjud" : "Qolmadi"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" disabled={isPending} onClick={() => { setEditProduct(p); setFormOpen(true) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" disabled={isPending} onClick={() => toggleActive(p)}>
                          <Power className={`h-3.5 w-3.5 ${p.is_active ? "text-green-600" : "text-gray-400"}`} />
                        </Button>
                        <Button size="sm" variant="outline" disabled={isPending} onClick={() => toggleAvailable(p)} title="Mavjud/Qolmadi">
                          <PackageX className={`h-3.5 w-3.5 ${p.is_available !== false ? "text-blue-500" : "text-orange-500"}`} />
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
          scope={scope}
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
          const r = scope === "restaurant"
            ? await deleteMyProductAction(deleteId)
            : await deleteProductAction(deleteId)
          setDeleteLoading(false)
          setDeleteId("")
          r.success ? (toast.success("O'chirildi"), startTransition(() => router.refresh()))
            : toast.error(r.error)
        }}
      />

      <ConfirmDialog
        open={!!deleteCatId}
        onOpenChange={open => { if (!open) setDeleteCatId("") }}
        title="Kategoriyani o'chirish"
        description="Bu kategoriya o'chiriladi. Unga bog'langan mahsulotlar kategoriyasiz qoladi."
        confirmLabel="O'chirish"
        variant="destructive"
        loading={deleteCatLoading}
        onConfirm={deleteCategory}
      />
    </div>
  )
}
