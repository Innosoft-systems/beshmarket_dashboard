"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { GripVertical, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn, getFullImgUrl } from "@/lib/utils"
import {
  createMyMenuCategoryAction,
  updateMyMenuCategoryAction,
  deleteMyMenuCategoryAction,
  fetchMyCategoriesAction,
} from "@/lib/actions/restaurant-panel"

interface Props {
  restaurant: any
  categories: any[]
}

const emptyForm = { name_uz: "", name_ru: "", name_en: "", image: "", sort_order: 0, is_active: true }

export function CategoriesClient({ restaurant, categories: initialCategories }: Props) {
  const [categories, setCategories] = useState(initialCategories)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteId, setDeleteId] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const refetch = async () => {
    const res = await fetchMyCategoriesAction()
    if (res.success && Array.isArray(res.data)) setCategories(res.data)
  }

  useEffect(() => { refetch() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => { setEditTarget(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (cat: any) => {
    setEditTarget(cat)
    setForm({ name_uz: cat.name_uz, name_ru: cat.name_ru, name_en: cat.name_en, image: cat.image || "", sort_order: cat.sort_order ?? 0, is_active: cat.is_active ?? true })
    setModalOpen(true)
  }

  const uploadImage = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Xatolik")
      const url = `${process.env.NEXT_PUBLIC_API_URL}${json.data?.url || json.url}`
      setForm(f => ({ ...f, image: url }))
    } catch { toast.error("Rasm yuklanmadi") }
    setUploading(false)
  }

  const handleSubmit = async () => {
    if (!form.name_uz.trim()) return toast.error("UZ nomi majburiy")
    setLoading(true)
    const payload = {
      name_uz: form.name_uz,
      name_ru: form.name_ru || form.name_uz,
      name_en: form.name_en || form.name_uz,
      image: form.image || undefined,
      sort_order: Number(form.sort_order),
      is_active: form.is_active,
    }
    const r = editTarget
      ? await updateMyMenuCategoryAction(editTarget._id, payload)
      : await createMyMenuCategoryAction({ ...payload, restaurant_id: restaurant?._id })
    setLoading(false)
    if (r.success) {
      toast.success(editTarget ? "Yangilandi" : "Qo'shildi")
      setModalOpen(false)
      await refetch()
    } else toast.error(r.error)
  }

  const toggleActive = async (cat: any) => {
    const r = await updateMyMenuCategoryAction(cat._id, { is_active: !cat.is_active })
    if (r.success) await refetch()
    else toast.error(r.error)
  }

  const handleDelete = async () => {
    setLoading(true)
    const r = await deleteMyMenuCategoryAction(deleteId)
    setLoading(false)
    setDeleteId("")
    if (r.success) {
      toast.success("O'chirildi")
      await refetch()
    } else toast.error(r.error)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Kategoriya qo'shish
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-xl border py-16 text-center text-muted-foreground">Kategoriyalar yo'q</div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="h-11 w-8 px-2" />
                <th className="h-11 px-4 text-left font-medium">Rasm</th>
                <th className="h-11 px-4 text-left font-medium">UZ</th>
                <th className="h-11 px-4 text-left font-medium">RU</th>
                <th className="h-11 px-4 text-left font-medium">EN</th>
                <th className="h-11 px-4 text-center font-medium">Tartib</th>
                <th className="h-11 px-4 text-center font-medium">Status</th>
                <th className="h-11 px-4 text-right font-medium">Amal</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat: any) => (
                <tr key={cat._id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-2 text-muted-foreground"><GripVertical className="h-4 w-4" /></td>
                  <td className="px-4 py-2">
                    {cat.image
                      ? <img src={getFullImgUrl(cat.image)} alt="" className="h-10 w-10 rounded-lg object-cover border" />
                      : <div className="h-10 w-10 rounded-lg bg-muted" />
                    }
                  </td>
                  <td className="px-4 py-2 font-medium">{cat.name_uz}</td>
                  <td className="px-4 py-2 text-muted-foreground">{cat.name_ru}</td>
                  <td className="px-4 py-2 text-muted-foreground">{cat.name_en}</td>
                  <td className="px-4 py-2 text-center text-muted-foreground">{cat.sort_order ?? 0}</td>
                  <td className="px-4 py-2 text-center">
                    <Switch checked={cat.is_active} onCheckedChange={() => toggleActive(cat)} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(cat)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setDeleteId(cat._id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={open => { if (!open) setModalOpen(false) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Kategoriyani tahrirlash" : "Yangi kategoriya"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Image */}
            <div className="space-y-1">
              <Label>Rasm</Label>
              {form.image ? (
                <div className="relative inline-block">
                  <img src={getFullImgUrl(form.image)} alt="" className="h-24 w-24 rounded-xl object-cover border" />
                  <button onClick={() => setForm(f => ({ ...f, image: "" }))} className="absolute -top-2 -right-2 bg-white rounded-full border shadow-sm p-0.5">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed hover:bg-muted">
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Yuklash</span>
                  <input type="file" accept="image/*" className="hidden" disabled={uploading}
                    onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                </label>
              )}
            </div>

            {/* Names */}
            <div className="space-y-2">
              <div className="space-y-1">
                <Label>Nomi (UZ) <span className="text-red-500">*</span></Label>
                <Input placeholder="Salatlar" value={form.name_uz} onChange={e => setForm({ ...form, name_uz: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Nomi (RU)</Label>
                <Input placeholder="Салаты" value={form.name_ru} onChange={e => setForm({ ...form, name_ru: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Nomi (EN)</Label>
                <Input placeholder="Salads" value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} />
              </div>
            </div>

            {/* Sort order + Active */}
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1">
                <Label>Tartib raqami</Label>
                <Input type="number" min={0} value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} className="w-28" />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch id="is_active" checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <Label htmlFor="is_active">{form.is_active ? "Faol" : "Nofaol"}</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Bekor</Button>
            <Button disabled={loading || uploading} onClick={handleSubmit}>
              {loading ? "Saqlanmoqda..." : editTarget ? "Saqlash" : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={open => { if (!open) setDeleteId("") }}
        title="Kategoriyani o'chirish"
        description="Bu kategoriya o'chiriladi."
        confirmLabel="O'chirish"
        variant="destructive"
        loading={loading}
        onConfirm={handleDelete}
      />
    </div>
  )
}
