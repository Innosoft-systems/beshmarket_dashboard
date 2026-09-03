"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateSettingAction, updateLegalPageAction, getCourierFaqAction, updateCourierFaqAction } from "@/lib/actions/settings"
import { Bike, CarFront, CircleDollarSign, Gauge, Save } from "lucide-react"

const TABS = [
  { id: "general", label: "Umumiy" },
  { id: "terms", label: "Foydalanish shartlari" },
  { id: "privacy", label: "Maxfiylik siyosati" },
  { id: "faq", label: "FAQ" },
] as const

interface SettingItem {
  key: string
  value: unknown
}

interface LegalPage {
  slug: string
  title_uz?: string
  content_uz?: string
  title_ru?: string
  content_ru?: string
  title_en?: string
  content_en?: string
}

interface Props {
  settings: SettingItem[]
  legalPages: LegalPage[]
}

const PAYOUT_FIELDS = [
  {
    key: "courier_base_payout_bike",
    label: "Velosiped",
    description: "Har bir buyurtma uchun boshlang‘ich haq",
    icon: Bike,
  },
  {
    key: "courier_base_payout_moped",
    label: "Moped",
    description: "Har bir buyurtma uchun boshlang‘ich haq",
    icon: Gauge,
  },
  {
    key: "courier_base_payout_motorcycle",
    label: "Mototsikl",
    description: "Har bir buyurtma uchun boshlang‘ich haq",
    icon: Gauge,
  },
  {
    key: "courier_base_payout_car",
    label: "Mashina",
    description: "Har bir buyurtma uchun boshlang‘ich haq",
    icon: CarFront,
  },
] as const

type CourierSettingForm = {
  shift_cancellation_hours: string | number
  shift_penalty_per_hour: string | number
  courier_order_reject_penalty: string | number
  courier_per_km_rate: string | number
  courier_base_payout_bike: string | number
  courier_base_payout_moped: string | number
  courier_base_payout_motorcycle: string | number
  courier_base_payout_car: string | number
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
      {tab === "faq" && <CourierFaqSettings />}
    </div>
  )
}

function CourierGeneralSettings({ settings }: { settings: SettingItem[] }) {
  const router = useRouter()
  const getSetting = (key: string, fallback: number) => {
    const value = settings.find((setting) => setting.key === key)?.value
    return typeof value === "number" || typeof value === "string" ? value : fallback
  }
  const [form, setForm] = useState<CourierSettingForm>({
    shift_cancellation_hours: getSetting("shift_cancellation_hours", 12),
    shift_penalty_per_hour: getSetting("shift_penalty_per_hour", 10000),
    courier_order_reject_penalty: getSetting("courier_order_reject_penalty", 10000),
    courier_per_km_rate: getSetting("courier_per_km_rate", 1700),
    courier_base_payout_bike: getSetting("courier_base_payout_bike", 6000),
    courier_base_payout_moped: getSetting("courier_base_payout_moped", 6500),
    courier_base_payout_motorcycle: getSetting("courier_base_payout_motorcycle", 7000),
    courier_base_payout_car: getSetting("courier_base_payout_car", 8000),
  })
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    const invalidField = Object.entries(form).find(([, value]) => {
      const number = Number(value)
      return value === "" || !Number.isFinite(number) || number < 0 || !Number.isInteger(number)
    })

    if (invalidField) {
      toast.error("Barcha qiymatlar 0 yoki undan katta butun son bo‘lishi kerak")
      return
    }

    setLoading(true)
    try {
      const results = await Promise.all(
        Object.entries(form).map(([key, value]) => updateSettingAction(key, Number(value)))
      )
      const failed = results.find((result) => !result.success)
      if (failed) {
        toast.error(failed.error || "Sozlamalarni saqlashda xatolik yuz berdi")
        return
      }

      toast.success("Kuryer to‘lov sozlamalari saqlandi")
      router.refresh()
    } catch {
      toast.error("Sozlamalarni saqlashda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  const setField = (key: keyof CourierSettingForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const perKmRate = Number(form.courier_per_km_rate) || 0

  return (
    <div className="space-y-6 max-w-5xl">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CircleDollarSign className="size-5" />
            </div>
            <h2 className="text-lg font-semibold">Yetkazib berish haqi</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Kuryer daromadi bazaviy haq va bosib o‘tilgan masofa stavkasidan hisoblanadi.
              Smena bonusi bo‘lsa, u alohida qo‘shiladi.
            </p>
          </div>

          <div className="w-full rounded-xl bg-primary/[0.06] p-4 lg:w-72">
            <Label htmlFor="courier-per-km-rate" className="text-xs font-medium text-muted-foreground">
              1 km uchun haq
            </Label>
            <div className="relative mt-2">
              <Input
                id="courier-per-km-rate"
                type="number"
                min={0}
                step={100}
                inputMode="numeric"
                value={form.courier_per_km_rate}
                onChange={(event) => setField("courier_per_km_rate", event.target.value)}
                className="h-12 bg-white pr-16 text-base font-semibold"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                so‘m
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Barcha transport turlari uchun umumiy stavka</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {PAYOUT_FIELDS.map((field) => {
            const Icon = field.icon
            const basePayout = Number(form[field.key]) || 0
            const threeKmPayout = basePayout + perKmRate * 3

            return (
              <div key={field.key} className="rounded-xl bg-muted/45 p-4 transition-colors focus-within:bg-muted/70">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-foreground shadow-sm">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <Label htmlFor={field.key} className="font-semibold">{field.label}</Label>
                    <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{field.description}</p>
                  </div>
                </div>

                <div className="relative mt-4">
                  <Input
                    id={field.key}
                    type="number"
                    min={0}
                    step={100}
                    inputMode="numeric"
                    value={form[field.key]}
                    onChange={(event) => setField(field.key, event.target.value)}
                    className="bg-white pr-16 font-medium"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                    so‘m
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">3 km misol</span>
                  <span className="font-semibold tabular-nums">{threeKmPayout.toLocaleString("uz-UZ")} so‘m</span>
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          Formula: transport bazaviy haqi + masofa × 1 km stavkasi + smena bonusi
        </p>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold">Smena va jarimalar</h2>
          <p className="mt-1 text-sm text-muted-foreground">Kuryer intizomi bilan bog‘liq umumiy qiymatlar.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="shift-cancellation-hours">Bepul bekor qilish muddati</Label>
            <div className="relative">
              <Input id="shift-cancellation-hours" type="number" min={0} step={1} value={form.shift_cancellation_hours} onChange={(event) => setField("shift_cancellation_hours", event.target.value)} className="pr-16" />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">soat</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shift-penalty">Soatlik jarima</Label>
            <div className="relative">
              <Input id="shift-penalty" type="number" min={0} step={100} value={form.shift_penalty_per_hour} onChange={(event) => setField("shift_penalty_per_hour", event.target.value)} className="pr-16" />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">so‘m</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reject-penalty">Buyurtmani rad etish jarimasi</Label>
            <div className="relative">
              <Input id="reject-penalty" type="number" min={0} step={100} value={form.courier_order_reject_penalty} onChange={(event) => setField("courier_order_reject_penalty", event.target.value)} className="pr-16" />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">so‘m</span>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end">
        <Button onClick={handleSave} disabled={loading} size="lg" className="min-w-36">
          <Save className="size-4" />
          {loading ? "Saqlanmoqda..." : "Saqlash"}
        </Button>
      </div>
    </div>
  )
}

function LegalEditor({ slug, legalPages }: { slug: string; legalPages: LegalPage[] }) {
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

function CourierFaqSettings() {
  const [items, setItems] = useState<{ question_uz: string; answer_uz: string; question_ru: string; answer_ru: string; question_en: string; answer_en: string; is_active?: boolean }[]>([])
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ question_uz: "", answer_uz: "", question_ru: "", answer_ru: "", question_en: "", answer_en: "" })

  useEffect(() => {
    getCourierFaqAction().then((res) => {
      if (res.data?.faqs) setItems(res.data.faqs)
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
    toast.success("O‘chirildi")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Jami: {items.length} ta savol</p>
        <Button onClick={openNew}>+ Savol qo‘shish</Button>
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
                    <Button variant="ghost" size="sm" onClick={() => removeItem(i)} className="text-red-500">O‘chirish</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/10 p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain shadow-lg ring-1 ring-foreground/10 space-y-4">
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
