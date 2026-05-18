"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { YMaps, Map, Placemark } from "@pbe/react-yandex-maps"
import { LocateFixed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageUploader } from "@/components/ui/image-uploader"
import { updateMyRestaurantAction } from "@/lib/actions/restaurant-panel"

export function RestaurantProfileForm({ restaurant }: { restaurant: any }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [locating, setLocating] = useState(false)
  const mapRef = useRef<any>(null)
  const [form, setForm] = useState({
    name: restaurant.name || "",
    description: restaurant.description || "",
    logo: restaurant.logo || "",
    cover_image: restaurant.cover_image || "",
    phone: restaurant.phone || "",
    address: restaurant.address || "",
    city: restaurant.city || "",
    district: restaurant.district || "",
    lat: restaurant.lat ?? null,
    lng: restaurant.lng ?? null,
    cuisine_tags: (restaurant.cuisine_tags || []).join(", "),
    avg_prep_time: restaurant.avg_prep_time || 30,
    min_order_amount: restaurant.min_order_amount || 0,
  })

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Brauzeringiz geolokatsiyani qo'llab-quvvatlamaydi")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((prev) => ({ ...prev, lat: coords.latitude, lng: coords.longitude }))
        mapRef.current?.setCenter([coords.latitude, coords.longitude], 16)
        setLocating(false)
      },
      () => {
        toast.error("Joylashuvni aniqlab bo'lmadi")
        setLocating(false)
      },
      { timeout: 10_000 },
    )
  }

  const handleMapClick = (e: any) => {
    const [lat, lng] = e.get("coords")
    setForm((prev) => ({ ...prev, lat, lng }))
  }

  const save = async () => {
    const result = await updateMyRestaurantAction({
      ...form,
      lat: form.lat != null ? Number(form.lat) : undefined,
      lng: form.lng != null ? Number(form.lng) : undefined,
      avg_prep_time: Number(form.avg_prep_time) || 30,
      min_order_amount: Number(form.min_order_amount) || 0,
      cuisine_tags: form.cuisine_tags.split(",").map((t: string) => t.trim()).filter(Boolean),
    })
    if (result.success) {
      toast.success("Profil saqlandi")
      startTransition(() => router.refresh())
    } else {
      toast.error(result.error)
    }
  }

  const mapCenter: [number, number] =
    form.lat != null && form.lng != null
      ? [Number(form.lat), Number(form.lng)]
      : [41.311081, 69.240562]

  return (
    <div className="space-y-5 rounded-lg border bg-background p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nomi" value={form.name} onChange={(v) => set("name", v)} />
        <Field label="Telefon" value={form.phone} onChange={(v) => set("phone", v)} />
        <Field label="Shahar" value={form.city} onChange={(v) => set("city", v)} />
        <Field label="Tuman" value={form.district} onChange={(v) => set("district", v)} />
        <Field label="Manzil" value={form.address} onChange={(v) => set("address", v)} className="md:col-span-2" />
        <Field label="Teglar (vergul bilan)" value={form.cuisine_tags} onChange={(v) => set("cuisine_tags", v)} className="md:col-span-2" />
        <Field label="Tayyorlash vaqti (daq)" type="number" value={String(form.avg_prep_time)} onChange={(v) => set("avg_prep_time", v)} />
        <Field label="Minimal buyurtma (so'm)" type="number" value={String(form.min_order_amount)} onChange={(v) => set("min_order_amount", v)} />

        <div className="space-y-2">
          <Label>Logo</Label>
          <ImageUploader value={form.logo} onChange={(url) => set("logo", url)} />
        </div>
        <div className="space-y-2">
          <Label>Muqova rasmi</Label>
          <ImageUploader value={form.cover_image} onChange={(url) => set("cover_image", url)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tavsif</Label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Joylashuv — xaritada bosib o'zgartiring</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={locating}
            onClick={handleCurrentLocation}
          >
            <LocateFixed className="mr-2 h-4 w-4" />
            {locating ? "Aniqlanmoqda..." : "Joriy joylashuv"}
          </Button>
        </div>
        <div className="h-[280px] w-full overflow-hidden rounded-lg border">
          <YMaps>
            <Map
              instanceRef={mapRef}
              defaultState={{ center: mapCenter, zoom: 13 }}
              width="100%"
              height="100%"
              onClick={handleMapClick}
            >
              {form.lat != null && form.lng != null && (
                <Placemark geometry={[Number(form.lat), Number(form.lng)]} />
              )}
            </Map>
          </YMaps>
        </div>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <span>Lat: {form.lat != null ? Number(form.lat).toFixed(6) : "—"}</span>
          <span>Lng: {form.lng != null ? Number(form.lng).toFixed(6) : "—"}</span>
        </div>
      </div>

      <Button onClick={save} disabled={isPending}>Saqlash</Button>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
