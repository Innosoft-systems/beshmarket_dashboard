"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { Send, Users, Truck, Globe, Bell, ImagePlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { sendBroadcastAction } from "@/lib/actions/notifications"

const TYPES = [
  { value: "system", label: "Tizim" },
  { value: "promotion", label: "Aksiya / Promo" },
  { value: "discount", label: "Chegirma" },
  { value: "order", label: "Buyurtma" },
]

const TARGETS = [
  { value: "all", label: "Barcha foydalanuvchilar", icon: Globe, color: "text-blue-500" },
  { value: "clients", label: "Faqat mijozlar", icon: Users, color: "text-green-500" },
  { value: "couriers", label: "Faqat kuryerlar", icon: Truck, color: "text-amber-500" },
]

interface Props {
  recentNotifications: any[]
}

export function NotificationsClient({ recentNotifications }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    title: "",
    body: "",
    type: "system",
    target: "all",
  })

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    e.target.value = ""
  }

  const clearImage = () => { setImageFile(null); setImagePreview(null) }

  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()
      return data.url || null
    } catch { return null }
  }

  const handleSend = async () => {
    if (!form.title.trim() || !form.body.trim()) return toast.error("Sarlavha va matn majburiy")

    setLoading(true)
    setResult(null)

    let image_url: string | undefined
    if (imageFile) {
      image_url = (await uploadImage(imageFile)) || undefined
      if (!image_url) { toast.error("Rasm yuklanmadi"); setLoading(false); return }
    }

    const result = await sendBroadcastAction({ ...form, image_url } as Parameters<typeof sendBroadcastAction>[0])
    if (result.success) {
      setResult(result.data)
      toast.success(`Yuborildi: ${result.data?.success ?? 0} ta qurilma`)
      setForm({ title: "", body: "", type: "system", target: "all" })
      clearImage()
    } else {
      toast.error(result.error || "Xatolik")
    }
    setLoading(false)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Send form */}
      <div className="space-y-5">
        <div className="rounded-xl border bg-background p-6 space-y-5">
          <h2 className="font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-500" />
            Xabar yuborish
          </h2>

          {/* Target */}
          <div className="space-y-2">
            <Label>Kimga</Label>
            <div className="grid grid-cols-3 gap-2">
              {TARGETS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setForm({ ...form, target: t.value })}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-sm transition-colors ${
                    form.target === t.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-input hover:bg-muted/50"
                  }`}
                >
                  <t.icon className={`h-5 w-5 ${form.target === t.value ? "text-primary" : t.color}`} />
                  <span className="text-xs font-medium leading-tight text-center">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Tur</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v ?? form.type })}>
              <SelectTrigger>
                <SelectValue>{TYPES.find(t => t.value === form.type)?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label>Sarlavha *</Label>
            <Input
              placeholder="Yangi chegirma mavjud!"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground text-right">{form.title.length}/100</p>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label>Xabar matni *</Label>
            <textarea
              className="w-full min-h-24 rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
              placeholder="Bugun barcha buyurtmalarga 20% chegirma..."
              value={form.body}
              onChange={e => setForm({ ...form, body: e.target.value })}
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground text-right">{form.body.length}/300</p>
          </div>

          {/* Image */}
          <div className="space-y-1.5">
            <Label>Rasm (ixtiyoriy)</Label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="h-24 rounded-lg object-cover" />
                <button onClick={clearImage} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="h-4 w-4 mr-2" />
                Rasm qo&apos;shish
              </Button>
            )}
          </div>

          <Button className="w-full" disabled={loading || !form.title || !form.body} onClick={handleSend}>
            <Send className="h-4 w-4 mr-2" />
            {loading ? "Yuborilmoqda..." : "Yuborish"}
          </Button>

          {/* Result */}
          {result && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm space-y-1">
              <p className="font-medium text-green-700">Muvaffaqiyatli yuborildi ✅</p>
              <div className="text-green-600 space-y-0.5">
                <p>Jami qurilmalar: {result.sent}</p>
                <p>Muvaffaqiyatli: {result.success}</p>
                {result.failed > 0 && <p>Xatolik: {result.failed}</p>}
                {!result.firebase_configured && (
                  <p className="text-amber-600">⚠️ Firebase sozlanmagan — xabarlar DB ga saqlandi, push yuborilmadi</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        {(form.title || form.body) && (
          <div className="rounded-xl border bg-background p-5 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Ko'rinish</h3>
            <div className="bg-muted rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Bell className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{form.title || "Sarlavha"}</p>
                  <p className="text-xs text-muted-foreground">BeshMarket · Hozir</p>
                </div>
              </div>
              <p className="text-sm pl-10">{form.body || "Xabar matni..."}</p>
            </div>
          </div>
        )}
      </div>

      {/* Recent notifications */}
      <div className="rounded-xl border bg-background p-5 space-y-4">
        <h2 className="font-semibold">Oxirgi xabarlar</h2>
        {recentNotifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Xabarlar yo'q</p>
        ) : (
          <div className="space-y-3">
            {recentNotifications.map((n: any) => (
              <div key={n._id} className="p-3 rounded-lg border space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{n.title}</p>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(n.createdAt).toLocaleDateString("uz")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                <div className="flex gap-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    n.type === "system" ? "bg-blue-100 text-blue-700" :
                    n.type === "promotion" ? "bg-purple-100 text-purple-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>{TYPES.find(t => t.value === n.type)?.label || n.type}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
