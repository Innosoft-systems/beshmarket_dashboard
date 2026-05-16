"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateSettingAction, updateLegalPageAction } from "@/lib/actions/settings"

const TABS = [
  { id: "orders", label: "Buyurtma" },
  { id: "terms", label: "Foydalanish shartlari" },
  { id: "privacy", label: "Maxfiylik siyosati" },
  { id: "support", label: "Qo'llab-quvvatlash" },
  { id: "faq", label: "FAQ" },
  { id: "social", label: "Ijtimoiy tarmoqlar" },
  { id: "notifications", label: "Bildirishnoma" },
] as const

interface Props {
  settings: { key: string; value: any }[]
  legalPages: any[]
}

export function SettingsUsersClient({ settings, legalPages }: Props) {
  const [tab, setTab] = useState<string>("orders")

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-medium tracking-tight">Foydalanuvchi sozlamalari</h1>

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

      {tab === "orders" && <OrderSettings settings={settings} />}
      {tab === "terms" && <LegalEditor slug="terms" legalPages={legalPages} />}
      {tab === "privacy" && <LegalEditor slug="privacy" legalPages={legalPages} />}
      {tab === "support" && <SupportSettings settings={settings} />}
      {tab === "faq" && <FaqSettings settings={settings} />}
      {tab === "social" && <SocialSettings settings={settings} />}
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

function SupportSettings({ settings }: { settings: { key: string; value: any }[] }) {
  const router = useRouter()
  const getSetting = (key: string) => settings.find((s) => s.key === key)?.value || ""
  const [form, setForm] = useState({
    support_phone: getSetting("support_phone"),
    support_email: getSetting("support_email"),
    support_telegram: getSetting("support_telegram"),
  })
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    for (const [key, value] of Object.entries(form)) {
      await updateSettingAction(key, value)
    }
    setLoading(false)
    toast.success("Saqlandi")
    router.refresh()
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="space-y-2">
        <Label>Telefon raqam</Label>
        <Input value={form.support_phone} onChange={(e) => setForm({ ...form, support_phone: e.target.value })} placeholder="+998901234567" />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} placeholder="support@beshmarket.uz" />
      </div>
      <div className="space-y-2">
        <Label>Telegram</Label>
        <Input value={form.support_telegram} onChange={(e) => setForm({ ...form, support_telegram: e.target.value })} placeholder="@beshmarket_support" />
      </div>
      <Button onClick={handleSave} disabled={loading}>
        {loading ? "Saqlanmoqda..." : "Saqlash"}
      </Button>
    </div>
  )
}

function FaqSettings({ settings }: { settings: { key: string; value: any }[] }) {
  const router = useRouter()
  const existing = settings.find((s) => s.key === "faq_items")?.value || "[]"
  const [items, setItems] = useState<{ question_uz: string; answer_uz: string; question_ru: string; answer_ru: string; question_en: string; answer_en: string }[]>(
    typeof existing === "string" ? JSON.parse(existing) : existing
  )
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ question_uz: "", answer_uz: "", question_ru: "", answer_ru: "", question_en: "", answer_en: "" })

  const saveToBackend = async (updatedItems: typeof items) => {
    await updateSettingAction("faq_items", updatedItems)
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

function SocialSettings({ settings }: { settings: { key: string; value: any }[] }) {
  const router = useRouter()
  const getSetting = (key: string) => settings.find((s) => s.key === key)?.value || ""
  const [form, setForm] = useState({
    social_telegram: getSetting("social_telegram"),
    social_instagram: getSetting("social_instagram"),
    social_facebook: getSetting("social_facebook"),
    social_youtube: getSetting("social_youtube"),
  })
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    for (const [key, value] of Object.entries(form)) {
      await updateSettingAction(key, value)
    }
    setLoading(false)
    toast.success("Saqlandi")
    router.refresh()
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="space-y-2">
        <Label>Telegram</Label>
        <Input value={form.social_telegram} onChange={(e) => setForm({ ...form, social_telegram: e.target.value })} placeholder="https://t.me/beshmarket" />
      </div>
      <div className="space-y-2">
        <Label>Instagram</Label>
        <Input value={form.social_instagram} onChange={(e) => setForm({ ...form, social_instagram: e.target.value })} placeholder="https://instagram.com/beshmarket" />
      </div>
      <div className="space-y-2">
        <Label>Facebook</Label>
        <Input value={form.social_facebook} onChange={(e) => setForm({ ...form, social_facebook: e.target.value })} placeholder="https://facebook.com/beshmarket" />
      </div>
      <div className="space-y-2">
        <Label>YouTube</Label>
        <Input value={form.social_youtube} onChange={(e) => setForm({ ...form, social_youtube: e.target.value })} placeholder="https://youtube.com/@beshmarket" />
      </div>
      <Button onClick={handleSave} disabled={loading}>
        {loading ? "Saqlanmoqda..." : "Saqlash"}
      </Button>
    </div>
  )
}


function OrderSettings({ settings }: { settings: { key: string; value: any }[] }) {
  const router = useRouter()
  const getSetting = (key: string) => settings.find((s) => s.key === key)?.value ?? ""
  const [form, setForm] = useState({
    min_order_amount: getSetting("min_order_amount"),
    delivery_fee: getSetting("delivery_fee"),
    commission_rate: getSetting("commission_rate"),
    discount_percentage: getSetting("discount_percentage"),
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
        <Label>Minimal buyurtma summasi (so'm)</Label>
        <Input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} placeholder="15000" />
      </div>
      <div className="space-y-2">
        <Label>Yetkazib berish narxi (so'm)</Label>
        <Input type="number" value={form.delivery_fee} onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })} placeholder="5000" />
      </div>
      <div className="space-y-2">
        <Label>Komissiya foizi (%)</Label>
        <Input type="number" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} placeholder="15" />
      </div>
      <div className="space-y-2">
        <Label>Chegirma foizi (%)</Label>
        <Input type="number" value={form.discount_percentage} onChange={(e) => setForm({ ...form, discount_percentage: e.target.value })} placeholder="0" />
      </div>
      <Button onClick={handleSave} disabled={loading}>
        {loading ? "Saqlanmoqda..." : "Saqlash"}
      </Button>
    </div>
  )
}

