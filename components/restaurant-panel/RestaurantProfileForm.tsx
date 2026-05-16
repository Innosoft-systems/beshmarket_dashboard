"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateMyRestaurantAction } from "@/lib/actions/restaurant-panel"

export function RestaurantProfileForm({ restaurant }: { restaurant: any }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: restaurant.name || "",
    description: restaurant.description || "",
    logo: restaurant.logo || "",
    cover_image: restaurant.cover_image || "",
    phone: restaurant.phone || "",
    address: restaurant.address || "",
    city: restaurant.city || "",
    district: restaurant.district || "",
    lat: restaurant.lat || "",
    lng: restaurant.lng || "",
    cuisine_tags: (restaurant.cuisine_tags || []).join(", "),
    avg_prep_time: restaurant.avg_prep_time || 30,
    min_order_amount: restaurant.min_order_amount || 0,
    delivery_fee: restaurant.delivery_fee || 0,
  })

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const save = async () => {
    const result = await updateMyRestaurantAction({
      ...form,
      lat: form.lat ? Number(form.lat) : undefined,
      lng: form.lng ? Number(form.lng) : undefined,
      avg_prep_time: Number(form.avg_prep_time) || 30,
      min_order_amount: Number(form.min_order_amount) || 0,
      delivery_fee: Number(form.delivery_fee) || 0,
      cuisine_tags: form.cuisine_tags.split(",").map((tag: string) => tag.trim()).filter(Boolean),
    })
    if (result.success) {
      toast.success("Profil saqlandi")
      startTransition(() => router.refresh())
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-5 rounded-lg border bg-background p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nomi" value={form.name} onChange={(v) => set("name", v)} />
        <Field label="Telefon" value={form.phone} onChange={(v) => set("phone", v)} />
        <Field label="Shahar" value={form.city} onChange={(v) => set("city", v)} />
        <Field label="Tuman" value={form.district} onChange={(v) => set("district", v)} />
        <Field label="Manzil" value={form.address} onChange={(v) => set("address", v)} className="md:col-span-2" />
        <Field label="Logo URL" value={form.logo} onChange={(v) => set("logo", v)} />
        <Field label="Cover URL" value={form.cover_image} onChange={(v) => set("cover_image", v)} />
        <Field label="Latitude" value={String(form.lat)} onChange={(v) => set("lat", v)} />
        <Field label="Longitude" value={String(form.lng)} onChange={(v) => set("lng", v)} />
        <Field label="Teglar" value={form.cuisine_tags} onChange={(v) => set("cuisine_tags", v)} className="md:col-span-2" />
        <Field label="Tayyorlash vaqti" type="number" value={String(form.avg_prep_time)} onChange={(v) => set("avg_prep_time", v)} />
        <Field label="Minimal buyurtma" type="number" value={String(form.min_order_amount)} onChange={(v) => set("min_order_amount", v)} />
        <Field label="Yetkazish narxi" type="number" value={String(form.delivery_fee)} onChange={(v) => set("delivery_fee", v)} />
      </div>
      <div className="space-y-2">
        <Label>Tavsif</Label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
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
