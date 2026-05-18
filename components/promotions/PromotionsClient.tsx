"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Tag, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createPromotionAction, updatePromotionAction, deletePromotionAction } from "@/lib/actions/promotions"

interface Props {
  promotions: any[]
  currentUserId: string
}

const EMPTY_FORM = {
  code: "", title_uz: "", title_ru: "", title_en: "",
  discount_type: "percentage", discount_value: "",
  min_order_amount: "", max_discount_amount: "",
  max_uses: "", max_uses_per_user: "1",
  starts_at: "", expires_at: "", is_active: true,
}

export function PromotionsClient({ promotions, currentUserId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<any>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [search, setSearch] = useState("")

  const openCreate = () => { setEditItem(null); setForm(EMPTY_FORM); setFormOpen(true) }
  const openEdit = (p: any) => {
    setEditItem(p)
    setForm({
      code: p.code, title_uz: p.title_uz, title_ru: p.title_ru, title_en: p.title_en,
      discount_type: p.discount_type, discount_value: String(p.discount_value),
      min_order_amount: String(p.min_order_amount || ""), max_discount_amount: String(p.max_discount_amount || ""),
      max_uses: String(p.max_uses), max_uses_per_user: String(p.max_uses_per_user || 1),
      starts_at: p.starts_at?.split("T")[0] || "", expires_at: p.expires_at?.split("T")[0] || "",
      is_active: p.is_active,
    })
    setFormOpen(true)
  }

  const handleSubmit = async () => {
    const body = {
      ...form,
      discount_value: +form.discount_value,
      min_order_amount: form.min_order_amount ? +form.min_order_amount : 0,
      max_discount_amount: form.max_discount_amount ? +form.max_discount_amount : undefined,
      max_uses: +form.max_uses,
      max_uses_per_user: +form.max_uses_per_user,
      created_by: currentUserId,
    }
    setLoading(true)
    const result = editItem
      ? await updatePromotionAction(editItem._id, body)
      : await createPromotionAction(body)
    setLoading(false)
    if (result.success) {
      toast.success(editItem ? "Saqlandi" : "Yaratildi")
      setFormOpen(false)
      startTransition(() => router.refresh())
    } else toast.error(result.error)
  }

  const filtered = promotions.filter(p =>
    p.code.includes(search.toUpperCase()) ||
    p.title_uz?.toLowerCase().includes(search.toLowerCase())
  )

  const now = new Date()

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Kod yoki nom..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button className="ml-auto" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Promo kod qo'shish
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Jami", value: promotions.length, color: "border-blue-500" },
          { label: "Faol", value: promotions.filter(p => p.is_active && new Date(p.expires_at) > now).length, color: "border-green-500" },
          { label: "Muddati o'tgan", value: promotions.filter(p => new Date(p.expires_at) <= now).length, color: "border-red-500" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border ${s.color} bg-background p-4`}>
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="h-11 px-4 text-left font-medium">Kod</th>
              <th className="h-11 px-4 text-left font-medium">Nomi</th>
              <th className="h-11 px-4 text-left font-medium">Restoran</th>
              <th className="h-11 px-4 text-left font-medium">Chegirma</th>
              <th className="h-11 px-4 text-right font-medium">Foydalanish</th>
              <th className="h-11 px-4 text-left font-medium">Muddat</th>
              <th className="h-11 px-4 text-left font-medium">Status</th>
              <th className="h-11 px-4 text-right font-medium">Amal</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">Promo kodlar topilmadi</td></tr>
            )}
            {filtered.map((p: any) => {
              const expired = new Date(p.expires_at) <= now
              const active = p.is_active && !expired
              const restName = typeof p.restaurant_id === "object" ? p.restaurant_id?.name : null
              return (
                <tr key={p._id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono font-semibold text-primary">{p.code}</td>
                  <td className="px-4 py-3">{p.title_uz}</td>
                  <td className="px-4 py-3">
                    {restName
                      ? <Badge variant="outline" className="text-xs">{restName}</Badge>
                      : <span className="text-xs text-muted-foreground">Global</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="gap-1">
                      {p.discount_type === "percentage" ? `${p.discount_value}%` : `${p.discount_value.toLocaleString()} so'm`}
                    </Badge>
                    {p.min_order_amount > 0 && <div className="text-xs text-muted-foreground mt-0.5">Min: {p.min_order_amount.toLocaleString()} so'm</div>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={p.used_count >= p.max_uses ? "text-red-600" : ""}>{p.used_count}</span>
                    <span className="text-muted-foreground">/{p.max_uses}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div>{p.starts_at?.split("T")[0]}</div>
                    <div className={expired ? "text-red-500" : "text-muted-foreground"}>{p.expires_at?.split("T")[0]}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-600"}>
                      {expired ? "Muddati o'tgan" : active ? "Faol" : "Nofaol"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" disabled={isPending} onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
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

      {/* Form Dialog */}
      {formOpen && (
        <Dialog open onOpenChange={open => { if (!open) setFormOpen(false) }}>
          <DialogContent showCloseButton={false} className="!max-w-2xl p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold">{editItem ? "Promo kodni tahrirlash" : "Yangi promo kod"}</h2>
              <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <ScrollArea className="max-h-[70vh]">
              <div className="px-6 py-5 space-y-4">
                <div className="space-y-1.5">
                  <Label>Kod *</Label>
                  <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SUMMER2024" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {["uz", "ru", "en"].map(lang => (
                    <div key={lang} className="space-y-1.5">
                      <Label>Nomi ({lang.toUpperCase()})</Label>
                      <Input value={form[`title_${lang}`]} onChange={e => setForm({ ...form, [`title_${lang}`]: e.target.value })} />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Chegirma turi</Label>
                    <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v ?? form.discount_type })}>
                      <SelectTrigger><SelectValue>{form.discount_type === "percentage" ? "Foizli (%)" : "Belgilangan (so'm)"}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Foizli (%)</SelectItem>
                        <SelectItem value="fixed">Belgilangan (so'm)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Chegirma miqdori *</Label>
                    <Input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Minimal buyurtma (so'm)</Label>
                    <Input type="number" value={form.min_order_amount} onChange={e => setForm({ ...form, min_order_amount: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Maks chegirma (so'm)</Label>
                    <Input type="number" value={form.max_discount_amount} onChange={e => setForm({ ...form, max_discount_amount: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Jami foydalanish soni *</Label>
                    <Input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Bir foydalanuvchi uchun</Label>
                    <Input type="number" value={form.max_uses_per_user} onChange={e => setForm({ ...form, max_uses_per_user: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Boshlanish sanasi *</Label>
                    <Input type="date" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tugash sanasi *</Label>
                    <Input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded" />
                  <span className="text-sm">Faol</span>
                </label>
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Bekor qilish</Button>
              <Button disabled={loading} onClick={handleSubmit}>{loading ? "Saqlanmoqda..." : editItem ? "Saqlash" : "Yaratish"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={open => { if (!open) setDeleteId("") }}
        title="Promo kodni o'chirish"
        description="Bu promo kod o'chiriladi."
        confirmLabel="O'chirish"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={async () => {
          setDeleteLoading(true)
          const r = await deletePromotionAction(deleteId)
          setDeleteLoading(false)
          setDeleteId("")
          r.success ? (toast.success("O'chirildi"), startTransition(() => router.refresh())) : toast.error(r.error)
        }}
      />
    </div>
  )
}
