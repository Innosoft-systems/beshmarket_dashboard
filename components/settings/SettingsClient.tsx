"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateSettingAction, updateLegalPageAction, sendNotificationAction } from "@/lib/actions/settings"

const TABS = [
  { id: "users", label: "Foydalanuvchilar" },
  { id: "couriers", label: "Kuryerlar" },
  { id: "legal", label: "Huquqiy sahifalar" },
  { id: "notifications", label: "Bildirishnoma" },
] as const

const USER_SETTINGS = ["min_order_amount", "delivery_fee", "commission_rate"]
const COURIER_SETTINGS = ["shift_cancellation_hours", "shift_penalty_per_hour", "courier_order_reject_penalty"]

const SETTING_LABELS: Record<string, string> = {
  shift_cancellation_hours: "Smena bekor qilish (soat)",
  shift_penalty_per_hour: "Soatlik jarima (so'm)",
  courier_order_reject_penalty: "Buyurtma rad etish jarimasi (so'm)",
  min_order_amount: "Minimal buyurtma summasi (so'm)",
  delivery_fee: "Yetkazib berish narxi (so'm)",
  commission_rate: "Komissiya foizi (%)",
}

interface SettingsClientProps {
  settings: { key: string; value: any; description?: string }[]
  legalPages: { slug: string; title_uz: string; content_uz: string; title_ru: string; content_ru: string; title_en: string; content_en: string }[]
}

export function SettingsClient({ settings, legalPages }: SettingsClientProps) {
  const [tab, setTab] = useState<string>("general")

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-medium tracking-tight">Sozlamalar</h1>

      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "users" && <GeneralSettings settings={settings.filter(s => USER_SETTINGS.includes(s.key))} />}
      {tab === "couriers" && <GeneralSettings settings={settings.filter(s => COURIER_SETTINGS.includes(s.key))} />}
      {tab === "legal" && <LegalSettings legalPages={legalPages} />}
      {tab === "notifications" && <NotificationSender />}
    </div>
  )
}

function GeneralSettings({ settings }: { settings: { key: string; value: any }[] }) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, any>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value]))
  )
  const [loading, setLoading] = useState(false)

  const handleSave = async (key: string) => {
    setLoading(true)
    const result = await updateSettingAction(key, Number(values[key]))
    setLoading(false)
    if (result.success) {
      toast.success("Saqlandi")
      router.refresh()
    } else {
      toast.error(result.error || "Xatolik")
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      {settings.map((s) => (
        <div key={s.key} className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <Label>{SETTING_LABELS[s.key] || s.key}</Label>
            <Input
              type="number"
              value={values[s.key] ?? ""}
              onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
            />
          </div>
          <Button onClick={() => handleSave(s.key)} disabled={loading} size="lg">
            Saqlash
          </Button>
        </div>
      ))}
    </div>
  )
}

function LegalSettings({ legalPages }: { legalPages: any[] }) {
  const router = useRouter()
  const [activePage, setActivePage] = useState(legalPages[0]?.slug || "terms")
  const page = legalPages.find((p) => p.slug === activePage)
  const [form, setForm] = useState(page || {})
  const [loading, setLoading] = useState(false)

  const handlePageChange = (slug: string) => {
    setActivePage(slug)
    const p = legalPages.find((lp) => lp.slug === slug)
    if (p) setForm(p)
  }

  const handleSave = async () => {
    setLoading(true)
    const result = await updateLegalPageAction(activePage, {
      title_uz: form.title_uz,
      content_uz: form.content_uz,
      title_ru: form.title_ru,
      content_ru: form.content_ru,
      title_en: form.title_en,
      content_en: form.content_en,
    })
    setLoading(false)
    if (result.success) {
      toast.success("Saqlandi")
      router.refresh()
    } else {
      toast.error(result.error || "Xatolik")
    }
  }

  const SLUGS = [
    { value: "terms", label: "Foydalanish shartlari" },
    { value: "privacy", label: "Maxfiylik siyosati" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {SLUGS.map((s) => (
          <Button
            key={s.value}
            variant={activePage === s.value ? "default" : "outline"}
            size="sm"
            onClick={() => handlePageChange(s.value)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {page && (
        <div className="space-y-4 max-w-2xl">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Sarlavha (UZ)</Label>
              <Input value={form.title_uz || ""} onChange={(e) => setForm({ ...form, title_uz: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Sarlavha (RU)</Label>
              <Input value={form.title_ru || ""} onChange={(e) => setForm({ ...form, title_ru: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Sarlavha (EN)</Label>
              <Input value={form.title_en || ""} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Matn (UZ)</Label>
            <textarea
              className="w-full min-h-[120px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              value={form.content_uz || ""}
              onChange={(e) => setForm({ ...form, content_uz: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Matn (RU)</Label>
            <textarea
              className="w-full min-h-[120px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              value={form.content_ru || ""}
              onChange={(e) => setForm({ ...form, content_ru: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Matn (EN)</Label>
            <textarea
              className="w-full min-h-[120px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              value={form.content_en || ""}
              onChange={(e) => setForm({ ...form, content_en: e.target.value })}
            />
          </div>

          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </div>
      )}
    </div>
  )
}

function NotificationSender() {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Sarlavha va matn kiritish shart")
      return
    }

    setLoading(true)
    // Barcha userlarga yuborish uchun broadcast type
    const result = await sendNotificationAction({
      user_id: "000000000000000000000000", // broadcast placeholder
      type: "admin_broadcast",
      title,
      body,
    })
    setLoading(false)

    if (result.success) {
      toast.success("Bildirishnoma yuborildi")
      setTitle("")
      setBody("")
    } else {
      toast.error(result.error || "Xatolik")
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm text-muted-foreground">Barcha foydalanuvchilarga bildirishnoma yuborish</p>

      <div className="space-y-2">
        <Label>Sarlavha</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bildirishnoma sarlavhasi" />
      </div>

      <div className="space-y-2">
        <Label>Matn</Label>
        <textarea
          className="w-full min-h-[100px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Bildirishnoma matni"
        />
      </div>

      <Button onClick={handleSend} disabled={loading}>
        {loading ? "Yuborilmoqda..." : "Yuborish"}
      </Button>
    </div>
  )
}
