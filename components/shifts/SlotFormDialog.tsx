"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { MapPin, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createSlotAction, updateSlotAction, bulkCreateSlotsAction } from "@/lib/actions/shifts"

const YANDEX_API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY || ""

type Mode = "single" | "bulk"

interface Props {
  slot?: any
  onClose: () => void
}

export function SlotFormDialog({ slot, onClose }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<Mode>("single")
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const placemarkRef = useRef<any>(null)

  const [form, setForm] = useState({
    date: slot?.date || "",
    start_time: slot?.start_time || "08:00",
    end_time: slot?.end_time || "12:00",
    zone_name: slot?.zone_name || "",
    lat: slot?.zone_coordinates?.lat || 41.311,
    lng: slot?.zone_coordinates?.lng || 69.279,
    payout: slot?.payout || 50000,
    bonus_per_order: slot?.bonus_per_order || "",
    max_couriers: slot?.max_couriers || 1,
  })

  const [bulk, setBulk] = useState({ from: "", to: "" })

  // Load Yandex Maps
  useEffect(() => {
    if (!mapRef.current) return

    const loadMap = () => {
      if (!(window as any).ymaps) return
      ;(window as any).ymaps.ready(() => {
        if (mapInstanceRef.current) return
        const map = new (window as any).ymaps.Map(mapRef.current, {
          center: [form.lat, form.lng],
          zoom: 12,
          controls: ["zoomControl"],
        })
        mapInstanceRef.current = map

        const placemark = new (window as any).ymaps.Placemark(
          [form.lat, form.lng],
          { balloonContent: form.zone_name || "Zona" },
          { preset: "islands#redDotIcon", draggable: true },
        )
        map.geoObjects.add(placemark)
        placemarkRef.current = placemark

        placemark.events.add("dragend", () => {
          const coords = placemark.geometry.getCoordinates()
          setForm((f) => ({ ...f, lat: coords[0], lng: coords[1] }))
        })

        map.events.add("click", (e: any) => {
          const coords = e.get("coords")
          placemark.geometry.setCoordinates(coords)
          setForm((f) => ({ ...f, lat: coords[0], lng: coords[1] }))
        })
      })
    }

    if ((window as any).ymaps) {
      loadMap()
    } else {
      const script = document.createElement("script")
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_API_KEY}&lang=uz_UZ`
      script.onload = loadMap
      document.head.appendChild(script)
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
        placemarkRef.current = null
      }
    }
  }, [])

  const isEdit = !!slot

  const handleSubmit = async () => {
    if (!form.zone_name.trim()) return toast.error("Zona nomi kiritilmagan")
    if (!isEdit && mode === "single" && !form.date) return toast.error("Sana kiritilmagan")
    if (!isEdit && mode === "bulk" && (!bulk.from || !bulk.to)) return toast.error("Sana oralig'i kiritilmagan")

    const slotData = {
      start_time: form.start_time,
      end_time: form.end_time,
      zone_name: form.zone_name,
      zone_coordinates: { lat: form.lat, lng: form.lng },
      payout: +form.payout,
      bonus_per_order: form.bonus_per_order ? +form.bonus_per_order : undefined,
      max_couriers: +form.max_couriers,
    }

    setLoading(true)
    let result

    if (isEdit) {
      result = await updateSlotAction(slot._id, slotData)
    } else if (mode === "bulk") {
      result = await bulkCreateSlotsAction({ from: bulk.from, to: bulk.to, slots: [slotData] })
      if (result.success) toast.success(`${result.data?.created ?? 0} ta yangi, ${result.data?.skipped ?? 0} ta yangilandi`)
    } else {
      result = await createSlotAction({ ...slotData, date: form.date })
    }

    setLoading(false)
    if (result?.success) {
      !isEdit && mode !== "bulk" && toast.success("Slot yaratildi")
      isEdit && toast.success("Saqlandi")
      startTransition(() => router.refresh())
      onClose()
    } else {
      toast.error(result?.error || "Xatolik")
    }
  }

  const F = (label: string, children: React.ReactNode) => (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
      <div className="bg-background rounded-xl shadow-lg ring-1 ring-foreground/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold">{isEdit ? "Slotni tahrirlash" : "Yangi slot yaratish"}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-6 space-y-5">
          {/* Mode tabs — only for create */}
          {!isEdit && (
            <div className="flex gap-2">
              <Button size="sm" variant={mode === "single" ? "default" : "outline"} onClick={() => setMode("single")}>Bitta kun</Button>
              <Button size="sm" variant={mode === "bulk" ? "default" : "outline"} onClick={() => setMode("bulk")}>Bir necha kun</Button>
            </div>
          )}

          {/* Date fields */}
          {!isEdit && mode === "single" && F("Sana", (
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          ))}
          {!isEdit && mode === "bulk" && (
            <div className="grid grid-cols-2 gap-4">
              {F("Boshlanish sanasi", <Input type="date" value={bulk.from} onChange={(e) => setBulk({ ...bulk, from: e.target.value })} />)}
              {F("Tugash sanasi", <Input type="date" value={bulk.to} onChange={(e) => setBulk({ ...bulk, to: e.target.value })} />)}
            </div>
          )}

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            {F("Boshlanish vaqti", <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />)}
            {F("Tugash vaqti", <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />)}
          </div>

          {/* Zone name */}
          {F("Zona nomi", <Input placeholder="Masalan: Yunusobod" value={form.zone_name} onChange={(e) => setForm({ ...form, zone_name: e.target.value })} />)}

          {/* Yandex Map */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-500" />
              Boshlash nuqtasi (xaritadan tanlang)
            </Label>
            <div ref={mapRef} className="w-full h-64 rounded-lg border overflow-hidden bg-muted" />
            <p className="text-xs text-muted-foreground">
              Lat: {form.lat.toFixed(6)}, Lng: {form.lng.toFixed(6)}
            </p>
          </div>

          {/* Payout, bonus, max_couriers */}
          <div className="grid grid-cols-3 gap-4">
            {F("To'lov (so'm)", <Input type="number" value={form.payout} onChange={(e) => setForm({ ...form, payout: +e.target.value })} />)}
            {F("Bonus/buyurtma (ixtiyoriy)", <Input type="number" placeholder="8000" value={form.bonus_per_order} onChange={(e) => setForm({ ...form, bonus_per_order: e.target.value })} />)}
            {F("Maks. kuryerlar", <Input type="number" min={1} value={form.max_couriers} onChange={(e) => setForm({ ...form, max_couriers: +e.target.value })} />)}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button disabled={loading} onClick={handleSubmit}>
            {loading ? "Saqlanmoqda..." : isEdit ? "Saqlash" : mode === "bulk" ? "Bulk yaratish" : "Yaratish"}
          </Button>
        </div>
      </div>
    </div>
  )
}
