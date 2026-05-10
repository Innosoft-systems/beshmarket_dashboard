"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { YMaps, Map, Placemark } from "@pbe/react-yandex-maps"
import { Restaurant } from "@/lib/api/restaurants"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { getAccessToken } from "@/lib/auth/session"
import { toast } from "sonner"

const restaurantSchema = z.object({
  name: z.string().min(2, "Kamida 2 ta belgi"),
  phone: z.string().min(9, "Telefon raqam kiriting"),
  city: z.string().min(2, "Shahar kiriting"),
  district: z.string().min(2, "Tuman kiriting"),
  address: z.string().min(5, "Manzil kiriting"),
  description: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  cuisine_tags: z.string().optional(), // We'll parse this as array later
  eco_score: z.any().optional(),
  avg_prep_time: z.any().optional(),
  min_order_amount: z.any().optional(),
  delivery_fee: z.any().optional(),
  commission_rate: z.any().optional(),
  logo: z.string().optional(),
  cover_image: z.string().optional(),
  is_active: z.boolean(),
  is_open: z.boolean(),
})

export type RestaurantFormValues = z.infer<typeof restaurantSchema>

interface RestaurantFormProps {
  initialData?: Restaurant
  onSubmit: (data: any) => Promise<void> // We will pass mapped data
  onCancel?: () => void
  accessToken: string
}

export function RestaurantForm({ initialData, onSubmit, onCancel, accessToken }: RestaurantFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [mapCenter, setMapCenter] = useState([initialData?.lat || 41.311081, initialData?.lng || 69.240562])

  const form = useForm<RestaurantFormValues>({
    resolver: zodResolver(restaurantSchema),
    defaultValues: {
      name: initialData?.name || "",
      phone: initialData?.phone || "+998",
      city: initialData?.city || "Toshkent",
      district: initialData?.district || "",
      address: initialData?.address || "",
      description: initialData?.description || "",
      lat: initialData?.lat,
      lng: initialData?.lng,
      cuisine_tags: initialData?.cuisine_tags?.join(", ") || "",
      eco_score: initialData?.eco_score || 0,
      avg_prep_time: initialData?.avg_prep_time || 30,
      min_order_amount: initialData?.min_order_amount || 0,
      delivery_fee: initialData?.delivery_fee || 0,
      commission_rate: initialData?.commission_rate || 10,
      logo: initialData?.logo || "",
      cover_image: initialData?.cover_image || "",
      is_active: initialData?.is_active ?? true,
      is_open: initialData?.is_open ?? true,
    },
  })

  const handleMapClick = (e: any) => {
    const coords = e.get("coords")
    setMapCenter(coords)
    form.setValue("lat", coords[0])
    form.setValue("lng", coords[1])
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: "logo" | "cover_image") => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    try {
      toast.loading("Rasm yuklanmoqda...", { id: `upload-${fieldName}` })
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const res = await fetch(`${baseUrl}/api/v1/upload/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: formData,
      })
      if (!res.ok) throw new Error("Yuklashda xatolik")
      const data = await res.json()
      form.setValue(fieldName, data.url)
      toast.success("Rasm yuklandi", { id: `upload-${fieldName}` })
    } catch (error) {
      toast.error("Rasm yuklashda xatolik", { id: `upload-${fieldName}` })
    }
  }

  const handleSubmit = async (values: RestaurantFormValues) => {
    try {
      setIsLoading(true)
      // Parse tags
      const mappedValues = {
        ...values,
        cuisine_tags: values.cuisine_tags ? values.cuisine_tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        eco_score: Number(values.eco_score) || 0,
        avg_prep_time: Number(values.avg_prep_time) || 0,
        min_order_amount: Number(values.min_order_amount) || 0,
        delivery_fee: Number(values.delivery_fee) || 0,
        commission_rate: Number(values.commission_rate) || 0,
      }
      await onSubmit(mappedValues)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        
        {/* Main Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Restoran nomi</FormLabel>
                <FormControl><Input placeholder="Masalan: Samarqand Oshi" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefon raqam</FormLabel>
                <FormControl><Input placeholder="+998901234567" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Location Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shahar</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="district"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tuman</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Manzil</FormLabel>
                <FormControl><Input placeholder="To'liq manzil" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Map Section */}
        <div className="border rounded-md p-2 bg-slate-50">
          <FormLabel className="mb-2 block">Xaritadan joylashuvni tanlang</FormLabel>
          <div className="h-[250px] w-full overflow-hidden rounded-md border">
            <YMaps>
              <Map 
                defaultState={{ center: mapCenter, zoom: 12 }} 
                width="100%" 
                height="100%"
                onClick={handleMapClick}
              >
                {form.watch("lat") && form.watch("lng") && (
                  <Placemark geometry={[form.watch("lat"), form.watch("lng")]} />
                )}
              </Map>
            </YMaps>
          </div>
          <div className="text-xs text-muted-foreground mt-2 flex gap-4">
            <span>Lat: {form.watch("lat") || "-"}</span>
            <span>Lng: {form.watch("lng") || "-"}</span>
          </div>
        </div>

        {/* Financials & Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="min_order_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min. buyurtma (sum)</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="delivery_fee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Yetkazish narxi (sum)</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="avg_prep_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tayyorlash vaqti (min)</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="commission_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Komissiya (%)</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cuisine_tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Oshxona turlari (vergul bilan)</FormLabel>
                <FormControl><Input placeholder="Milliy, Yevropa, Fast food" {...field} /></FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qisqacha ma'lumot</FormLabel>
                <FormControl><Input placeholder="Restoran haqida" {...field} /></FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Images */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="logo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logo URL yoki Yuklash</FormLabel>
                <div className="flex gap-2">
                  <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                  <Input type="file" className="w-[120px]" accept="image/*" onChange={(e) => handleImageUpload(e, "logo")} />
                </div>
                {field.value && <img src={field.value} alt="logo" className="h-10 object-contain" />}
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cover_image"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Muqova rasm yoki Yuklash</FormLabel>
                <div className="flex gap-2">
                  <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                  <Input type="file" className="w-[120px]" accept="image/*" onChange={(e) => handleImageUpload(e, "cover_image")} />
                </div>
                {field.value && <img src={field.value} alt="cover" className="h-10 object-cover" />}
              </FormItem>
            )}
          />
        </div>

        {/* Toggles */}
        <div className="flex gap-4 border rounded-md p-4">
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-4 w-full">
                <FormLabel className="text-base m-0">Faol holat (Katalogda ko'rinadi)</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="is_open"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-4 w-full">
                <FormLabel className="text-base m-0">Hozir ochiq (Buyurtma oladi)</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Bekor qilish
            </Button>
          )}
          <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
            {isLoading ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
