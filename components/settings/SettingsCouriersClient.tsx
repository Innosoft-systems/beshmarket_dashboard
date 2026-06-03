"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateSettingAction, updateLegalPageAction, getCourierFaqAction, updateCourierFaqAction } from "@/lib/actions/settings"

const TABS = [
  { id: "general", label: "Umumiy" },
  { id: "terms", label: "Foydalanish shartlari" },
  { id: "privacy", label: "Maxfiylik siyosati" },
  { id: "faq", label: "FAQ" },
] as const

interface Props {
  settings: { key: string; value: any }[]
  legalPages: any[]
}

export function SettingsCouriersClient({ settings, legalPages }: Props) {
  const [tab, setTab] = useState<string>("general")

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-medium tracking-tight">Kuryer sozlamalari</h1>

      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "general" && <CourierGeneralSettings settings={settings} />}
      {tab === "terms" && <LegalEditor slug="courier-terms" legalPages={legalPages} />}
      {tab === "privacy" && <LegalEditor slug="courier-privacy" legalPages={legalPages} />}
      {tab === "faq" && <CourierFaqSettings settings={settings} />}
    </div>
  )
}

function CourierGeneralSettings({ settings }: { settings: { key: string; value: any }[] }) {
  const router = useRouter()
  const getSetting = (key: string) => settings.find((s) => s.key === key)?.value ?? ""
  const [form, setForm] = useState({
    shift_cancellation_hours: getSetting("shift_cancellation_hours"),
    shift_penalty_per_hour: getSetting("shift_penalty_per_hour"),
    courier_order_reject_penalty: getSetting("courier_order_reject_penalty"),
    courier_per_km_rate: getSetting("courier_per_km_rate"),
    courier_base_payout_bike: getSetting("courier_base_payout_bike"),
    courier_base_payout_moped: getSetting("courier_base_payout_moped"),
    courier_base_payout_motorcycle: getSetting("courier_base_payout_motorcycle"),
    courier_base_payout_car: getSetting("courier_base_payout_car"),
  })
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    for (const [key, value] of Object.entries(form)) {
      await updateSettingAction(key, Number(value))
    }
    setLoading(false)
    toast.success("Saqlandi")
    router.refresh()
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="space-y-2">
        <Label>Smena bekor qilish (soat)</Label>
        <Input type="number" value={form.shift_cancellation_hours} onChange={(e) => setForm({ ...form, shift_cancellation_hours: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Soatlik jarima (so'm)</Label>
        <Input type="number" value={form.shift_penalty_per_hour} onChange={(e) => setForm({ ...form, shift_penalty_per_hour: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Buyurtma rad etish jarimasi (so'm)</Label>
        <Input type="number" value={form.courier_order_reject_penalty} onChange={(e) => setForm({ ...form, courier_order_reject_penalty: e.target.value })} />
      </div>

      <div className="pt-2 border-t">
        <p className="text-sm font-medium mb-3">Kuryer payout sozlamalari</p>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Har km uchun stavka (so'm)</Label>
            <Input type="number" value={form.courier_per_km_rate} onChange={(e) => setForm({ ...form, courier_per_km_rate: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Velosiped — asosiy to'lov (so'm)</Label>
              <Input type="number" value={form.courier_base_payout_bike} onChange={(e) => setForm({ ...form, courier_base_payout_bike: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Moped — asosiy to'lov (so'm)</Label>
              <Input type="number" value={form.courier_base_payout_moped} onChange={(e) => setForm({ ...form, courier_base_payout_moped: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Mototsiкl — asosiy to'lov (so'm)</Label>
              <Input type="number" value={form.courier_base_payout_motorcycle} onChange={(e) => setForm({ ...form, courier_base_payout_motorcycle: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Mashina — asosiy to'lov (so'm)</Label>
              <Input type="number" value={form.courier_base_payout_car} onChange={(e) => setForm({ ...form, courier_base_payout_car: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={loading}>
        {loading ? "Saqlanmoqda..." : "Saqlash"}
      </Button>
    </div>
  )
}

function LegalEditor({ slug, legalPages }: { slug: string; legalPages: any[] }) {
  const router = useRouter()
  const page = legalPages.find((p) => p.slug === slug)
  const [form, setForm] = useState({
    title_uz: page?.title_uz || "",
    content_uz: page?.content_uz || "",
    title_ru: page?.title_ru || "",
    content_ru: page?.content_ru || "",
    title_en: page?.title_en || "",
    content_en: page?.content_en || "",
  })
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    const result = await updateLegalPageAction(slug, form)
    setLoading(false)
    if (result.success) {
      toast.success("Saqlandi")
      router.refresh()
    } else {
      toast.error(result.error || "Xatolik")
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Sarlavha (UZ)</Label>
          <Input value={form.title_uz} onChange={(e) => setForm({ ...form, title_uz: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Sarlavha (RU)</Label>
          <Input value={form.title_ru} onChange={(e) => setForm({ ...form, title_ru: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Sarlavha (EN)</Label>
          <Input value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Matn (UZ)</Label>
        <textarea className="w-full min-h-[120px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm" value={form.content_uz} onChange={(e) => setForm({ ...form, content_uz: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Matn (RU)</Label>
        <textarea className="w-full min-h-[120px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm" value={form.content_ru} onChange={(e) => setForm({ ...form, content_ru: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Matn (EN)</Label>
        <textarea className="w-full min-h-[120px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm" value={form.content_en} onChange={(e) => setForm({ ...form, content_en: e.target.value })} />
      </div>
      <Button onClick={handleSave} disabled={loading}>
        {loading ? "Saqlanmoqda..." : "Saqlash"}
      </Button>
    </div>
  )
}

function CourierFaqSettings({ settings }: { settings: { key: string; value: any }[] }) {
  const router = useRouter()
  const [items, setItems] = useState<{ question_uz: string; answer_uz: string; question_ru: string; answer_ru: string; question_en: string; answer_en: string; is_active?: boolean }[]>([])
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ question_uz: "", answer_uz: "", question_ru: "", answer_ru: "", question_en: "", answer_en: "" })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getCourierFaqAction().then((res) => {
      if (res.data?.faqs) setItems(res.data.faqs)
      setLoaded(true)
    })
  }, [])

  const saveToBackend = async (updatedItems: typeof items) => {
    await updateCourierFaqAction(updatedItems.map(i => ({ ...i, is_active: i.is_active !== false })))
  }

  const openNew = () => {
    setForm({ question_uz: "", answer_uz: "", question_ru: "", answer_ru: "", question_en: "", answer_en: "" })
    setEditIndex(null)
    setFormOpen(true)
  }

  const openEdit = (i: number) => {
    setForm(items[i])
    setEditIndex(i)
    setFormOpen(true)
  }

  const saveForm = async () => {
    const updated = [...items]
    if (editIndex !== null) {
      updated[editIndex] = form
    } else {
      updated.push(form)
    }
    setItems(updated)
    setFormOpen(false)
    await saveToBackend(updated)
    toast.success("Saqlandi")
  }

  const removeItem = async (i: number) => {
    const updated = items.filter((_, idx) => idx !== i)
    setItems(updated)
    await saveToBackend(updated)
    toast.success("O'chirildi")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Jami: {items.length} ta savol</p>
        <Button onClick={openNew}>+ Savol qo'shish</Button>
      </div>

      {items.length > 0 && (
        <div className="rounded-md border bg-background">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="h-12 px-3 text-left font-medium">#</th>
                <th className="h-12 px-3 text-left font-medium">Savol (UZ)</th>
                <th className="h-12 px-3 text-left font-medium">Savol (RU)</th>
                <th className="h-12 px-3 text-left font-medium">Savol (EN)</th>
                <th className="h-12 px-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-3 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-3 truncate max-w-[200px]">{item.question_uz}</td>
                  <td className="px-3 py-3 truncate max-w-[200px]">{item.question_ru}</td>
                  <td className="px-3 py-3 truncate max-w-[200px]">{item.question_en}</td>
                  <td className="px-3 py-3 text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(i)}>Tahrirlash</Button>
                    <Button variant="ghost" size="sm" onClick={() => removeItem(i)} className="text-red-500">O'chirish</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">
          <div className="bg-background rounded-xl p-6 w-full max-w-2xl shadow-lg ring-1 ring-foreground/10 space-y-4">
            <h3 className="text-base font-medium">{editIndex !== null ? "Savolni tahrirlash" : "Yangi savol"}</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Savol (UZ)</Label>
                <Input value={form.question_uz} onChange={(e) => setForm({ ...form, question_uz: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Savol (RU)</Label>
                <Input value={form.question_ru} onChange={(e) => setForm({ ...form, question_ru: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Savol (EN)</Label>
                <Input value={form.question_en} onChange={(e) => setForm({ ...form, question_en: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Javob (UZ)</Label>
                <textarea className="w-full min-h-[80px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm" value={form.answer_uz} onChange={(e) => setForm({ ...form, answer_uz: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Javob (RU)</Label>
                <textarea className="w-full min-h-[80px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm" value={form.answer_ru} onChange={(e) => setForm({ ...form, answer_ru: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Javob (EN)</Label>
                <textarea className="w-full min-h-[80px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm" value={form.answer_en} onChange={(e) => setForm({ ...form, answer_en: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Bekor qilish</Button>
              <Button onClick={saveForm}>Saqlash</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


