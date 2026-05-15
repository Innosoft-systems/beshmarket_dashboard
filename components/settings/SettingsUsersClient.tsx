"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateSettingAction, updateLegalPageAction } from "@/lib/actions/settings"

const TABS = [
  { id: "terms", label: "Foydalanish shartlari" },
  { id: "privacy", label: "Maxfiylik siyosati" },
  { id: "support", label: "Qo'llab-quvvatlash" },
  { id: "faq", label: "FAQ" },
  { id: "social", label: "Ijtimoiy tarmoqlar" },
] as const

interface Props {
  settings: { key: string; value: any }[]
  legalPages: any[]
}

export function SettingsUsersClient({ settings, legalPages }: Props) {
  const [tab, setTab] = useState<string>("terms")

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
  const [items, setItems] = useState<{ question: string; answer: string }[]>(
    typeof existing === "string" ? JSON.parse(existing) : existing
  )
  const [loading, setLoading] = useState(false)

  const addItem = () => setItems([...items, { question: "", answer: "" }])
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: "question" | "answer", value: string) => {
    const updated = [...items]
    updated[i][field] = value
    setItems(updated)
  }

  const handleSave = async () => {
    setLoading(true)
    await updateSettingAction("faq_items", items)
    setLoading(false)
    toast.success("Saqlandi")
    router.refresh()
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {items.map((item, i) => (
        <div key={i} className="space-y-2 p-3 border rounded-lg">
          <div className="flex items-center justify-between">
            <Label>Savol #{i + 1}</Label>
            <Button variant="ghost" size="sm" onClick={() => removeItem(i)} className="text-red-500 text-xs">O'chirish</Button>
          </div>
          <Input value={item.question} onChange={(e) => updateItem(i, "question", e.target.value)} placeholder="Savol" />
          <textarea className="w-full min-h-[60px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm" value={item.answer} onChange={(e) => updateItem(i, "answer", e.target.value)} placeholder="Javob" />
        </div>
      ))}
      <div className="flex gap-3">
        <Button variant="outline" onClick={addItem}>+ Savol qo'shish</Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saqlanmoqda..." : "Saqlash"}
        </Button>
      </div>
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
