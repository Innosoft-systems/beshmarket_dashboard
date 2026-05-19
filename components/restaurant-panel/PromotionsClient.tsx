"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { createMyPromotionAction, deleteMyPromotionAction, updateMyPromotionAction } from "@/lib/actions/restaurant-panel"

const emptyForm = {
  code: "",
  title_uz: "",
  title_ru: "",
  title_en: "",
  discount_type: "percentage",
  discount_value: 10,
  min_order_amount: 0,
  max_discount_amount: "",
  max_uses: 100,
  max_uses_per_user: 1,
  starts_at: "",
  expires_at: "",
  is_active: true,
}

export function PromotionsClient({ promotions }: { promotions: any[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>(emptyForm)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const edit = (promo: any) => {
    setEditing(promo)
    setForm({
      ...emptyForm,
      ...promo,
      starts_at: promo.starts_at?.slice(0, 10) || "",
      expires_at: promo.expires_at?.slice(0, 10) || "",
      max_discount_amount: promo.max_discount_amount || "",
    })
  }

  const reset = () => {
    setEditing(null)
    setForm(emptyForm)
  }

  const save = async () => {
    if (!form.title_uz.trim()) {
      toast.error("Sarlavha (UZ) majburiy")
      return
    }
    if (!form.starts_at || !form.expires_at) {
      toast.error("Boshlanish va tugash sanasi majburiy")
      return
    }
    const startsAt = new Date(form.starts_at)
    const expiresAt = new Date(form.expires_at)
    if (isNaN(startsAt.getTime()) || isNaN(expiresAt.getTime())) {
      toast.error("Sana formati noto'g'ri")
      return
    }
    if (expiresAt <= startsAt) {
      toast.error("Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak")
      return
    }
    const discountValue = Number(form.discount_value)
    if (discountValue <= 0) {
      toast.error("Chegirma miqdori 0 dan katta bo'lishi kerak")
      return
    }
    if (form.discount_type === "percentage" && discountValue > 100) {
      toast.error("Foiz chegirma 100 dan oshmasligi kerak")
      return
    }

    const body = {
      code: form.code,
      title_uz: form.title_uz,
      title_ru: form.title_ru,
      title_en: form.title_en,
      discount_type: form.discount_type,
      discount_value: discountValue,
      min_order_amount: Number(form.min_order_amount) || 0,
      max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : undefined,
      max_uses: Number(form.max_uses) || 1,
      max_uses_per_user: Number(form.max_uses_per_user) || 1,
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      is_active: form.is_active,
    }
    const result = editing
      ? await updateMyPromotionAction(editing._id, body)
      : await createMyPromotionAction(body)
    if (result.success) {
      toast.success(editing ? "Promo saqlandi" : "Promo yaratildi")
      reset()
      startTransition(() => router.refresh())
    } else {
      toast.error(result.error)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    const result = await deleteMyPromotionAction(deleteId)
    setDeleteLoading(false)
    if (result.success) {
      toast.success("Promo o'chirildi")
      setDeleteId(null)
      startTransition(() => router.refresh())
    } else {
      toast.error(result.error)
    }
  }

  return (
    <>
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Promo kodni o'chirish"
        description="Bu amalni qaytarib bo'lmaydi. Promo kod butunlay o'chiriladi."
        confirmLabel="O'chirish"
        loading={deleteLoading}
        onConfirm={confirmDelete}
      />

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <div className="rounded-lg border bg-background p-4 space-y-3">
          <h2 className="font-medium">{editing ? "Promo tahrirlash" : "Yangi promo"}</h2>

          <div className="space-y-1">
            <label className="text-sm font-medium">Kod</label>
            <Input placeholder="SUMMER20" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Sarlavha (UZ) <span className="text-red-500">*</span></label>
            <Input placeholder="Yozuv" value={form.title_uz} onChange={(e) => setForm({ ...form, title_uz: e.target.value })} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Sarlavha (RU)</label>
            <Input placeholder="Название" value={form.title_ru} onChange={(e) => setForm({ ...form, title_ru: e.target.value })} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Sarlavha (EN)</label>
            <Input placeholder="Title" value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Chegirma turi</label>
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}>
              <option value="percentage">Foiz (%)</option>
              <option value="fixed">Aniq summa (so'm)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Chegirma <span className="text-red-500">*</span></label>
              <Input type="number" placeholder="10" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Min buyurtma (so'm)</label>
              <Input type="number" placeholder="0" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Max chegirma (so'm)</label>
              <Input type="number" placeholder="—" value={form.max_discount_amount} onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Foydalanish limiti</label>
              <Input type="number" placeholder="100" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Boshlanish sanasi</label>
              <Input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Tugash sanasi</label>
              <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Faol
          </label>
          <div className="flex gap-2">
            <Button disabled={isPending} onClick={save}>
              <Plus className="mr-2 h-4 w-4" />
              {editing ? "Saqlash" : "Yaratish"}
            </Button>
            {editing && <Button variant="outline" onClick={reset}>Bekor qilish</Button>}
          </div>
        </div>

        <div className="rounded-lg border bg-background overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="h-11 px-4 text-left font-medium">Kod</th>
                <th className="h-11 px-4 text-left font-medium">Nomi</th>
                <th className="h-11 px-4 text-right font-medium">Ishlatilgan</th>
                <th className="h-11 px-4 text-center font-medium">Status</th>
                <th className="h-11 px-4 text-right font-medium">Amal</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((promo) => (
                <tr key={promo._id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{promo.code}</td>
                  <td className="px-4 py-3">{promo.title_uz}</td>
                  <td className="px-4 py-3 text-right">{promo.used_count || 0}/{promo.max_uses}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className={promo.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                      {promo.is_active ? "Faol" : "Nofaol"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" aria-label="Tahrirlash" onClick={() => edit(promo)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-500" aria-label="O'chirish" onClick={() => setDeleteId(promo._id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {promotions.length === 0 && (
                <tr><td className="px-4 py-10 text-center text-muted-foreground" colSpan={5}>Promo kodlar yo'q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
