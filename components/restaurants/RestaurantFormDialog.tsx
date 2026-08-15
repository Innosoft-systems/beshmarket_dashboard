"use client"

import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Eye, EyeOff, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageUploader } from "@/components/ui/image-uploader"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Restaurant } from "@/types"
import { restaurantFormSchema, RestaurantFormValues } from "@/schemas"
import { createRestaurantAction, updateRestaurantAction } from "@/app/(dashboard)/restaurants/actions"

type FormValues = RestaurantFormValues

interface RestaurantFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurant?: Restaurant | null
  onSuccess: () => void
}

export function RestaurantFormDialog({
  open,
  onOpenChange,
  restaurant,
  onSuccess,
}: RestaurantFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [showOwnerPassword, setShowOwnerPassword] = useState(false)
  const isEdit = !!restaurant

  const { register, handleSubmit, setValue, setError, control, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(restaurantFormSchema),
    defaultValues: {
      name: restaurant?.name || "",
      phone: restaurant?.phone || "",
      address: restaurant?.address || "",
      city: restaurant?.city || "",
      district: restaurant?.district || "",
      logo: restaurant?.logo || "",
      owner_phone: restaurant?.owner_id && typeof restaurant.owner_id === "object" ? restaurant.owner_id.phone : "",
      owner_username: restaurant?.owner_id && typeof restaurant.owner_id === "object" ? restaurant.owner_id.username || "" : "",
      owner_password: "",
      type: (restaurant?.type as "restaurant" | "market") || "restaurant",
      order: restaurant?.order ?? 0,
      commission_rate: restaurant?.commission_rate ?? 15,
    },
  })

  const logoValue = useWatch({ control, name: "logo" })
  const typeValue = useWatch({ control, name: "type" })

  const onSubmit = async (data: FormValues) => {
    if (!isEdit && !data.owner_password) {
      setError("owner_password", { message: "Yangi restoran uchun parol kiritish shart" })
      return
    }
    setLoading(true)

    const result = isEdit
      ? await updateRestaurantAction(restaurant!._id, data)
      : await createRestaurantAction(data)

    setLoading(false)

    if (result.success) {
      toast.success(isEdit ? "Restoran yangilandi" : "Restoran yaratildi")
      reset()
      onOpenChange(false)
      onSuccess()
    } else {
      toast.error(result.error || "Xatolik yuz berdi")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); setShowOwnerPassword(false) }; onOpenChange(v) }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Restoranni tahrirlash" : "Yangi restoran"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Logo</Label>
            <ImageUploader
              value={logoValue}
              onChange={(url) => setValue("logo", url)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Nomi *</Label>
              <Input {...register("name")} placeholder="Restoran nomi" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Telefon *</Label>
              <Input {...register("phone")} placeholder="+998901234567" />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tartib raqami</Label>
              <Input type="number" min={0} {...register("order", { valueAsNumber: true })} placeholder="0" />
              {errors.order && <p className="text-xs text-red-500">{errors.order.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Turi</Label>
              <Select value={typeValue} onValueChange={(v) => setValue("type", v as "restaurant" | "market")}>
                <SelectTrigger>
                  <SelectValue>
                    {typeValue === "market" ? "Market" : "Restoran"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restaurant">Restoran</SelectItem>
                  <SelectItem value="market">Market</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Platforma komissiyasi (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.1}
              {...register("commission_rate", { valueAsNumber: true })}
              placeholder="15"
            />
            {errors.commission_rate && <p className="text-xs text-red-500">{errors.commission_rate.message}</p>}
            <p className="text-xs text-muted-foreground">
              Faqat mahsulotlar summasidan olinadi; yetkazish va xizmat haqi kirmaydi.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Shahar *</Label>
              <Input {...register("city")} placeholder="Toshkent" />
              {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Tuman *</Label>
              <Input {...register("district")} placeholder="Chilonzor" />
              {errors.district && <p className="text-xs text-red-500">{errors.district.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Manzil *</Label>
            <Input {...register("address")} placeholder="To'liq manzil" />
            {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
          </div>

          <section className="rounded-xl bg-muted/55 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-primary shadow-sm">
                <KeyRound className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">Panelga kirish</p>
                <p className="text-xs text-muted-foreground">Telefon emas, username va parol ishlatiladi</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Egasi telefon raqami *</Label>
                <Input {...register("owner_phone")} placeholder="+998901234567" autoComplete="tel" />
                {errors.owner_phone && <p className="text-xs text-red-500">{errors.owner_phone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Username *</Label>
                <Input
                  {...register("owner_username", {
                    setValueAs: value => typeof value === "string" ? value.trim().toLowerCase() : value,
                  })}
                  placeholder="oshxona_toshkent"
                  autoComplete="off"
                />
                {errors.owner_username && <p className="text-xs text-red-500">{errors.owner_username.message}</p>}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <Label>{isEdit ? "Yangi parol" : "Parol *"}</Label>
              <div className="relative">
                <Input
                  {...register("owner_password")}
                  type={showOwnerPassword ? "text" : "password"}
                  placeholder={isEdit ? "O‘zgartirmaslik uchun bo‘sh qoldiring" : "Kamida 12 ta belgi"}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOwnerPassword(value => !value)}
                  aria-label={showOwnerPassword ? "Parolni yashirish" : "Parolni ko‘rsatish"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showOwnerPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.owner_password && <p className="text-xs text-red-500">{errors.owner_password.message}</p>}
              {isEdit && (
                <p className="text-xs text-muted-foreground">Parol almashtirilsa restoran barcha qurilmalarda qayta kiradi.</p>
              )}
            </div>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saqlanmoqda..." : isEdit ? "Saqlash" : "Yaratish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
