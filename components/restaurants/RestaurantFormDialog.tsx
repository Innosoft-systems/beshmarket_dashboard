"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
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
  const isEdit = !!restaurant

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(restaurantFormSchema),
    defaultValues: {
      name: restaurant?.name || "",
      phone: restaurant?.phone || "",
      address: restaurant?.address || "",
      city: restaurant?.city || "",
      district: restaurant?.district || "",
      logo: restaurant?.logo || "",
      owner_phone: restaurant?.owner_id && typeof restaurant.owner_id === "object" ? restaurant.owner_id.phone : "",
      type: (restaurant?.type as "restaurant" | "market") || "restaurant",
      order: restaurant?.order ?? 0,
    },
  })

  const logoValue = watch("logo")

  const onSubmit = async (data: FormValues) => {
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
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-md">
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tartib raqami</Label>
              <Input type="number" min={0} {...register("order", { valueAsNumber: true })} placeholder="0" />
              {errors.order && <p className="text-xs text-red-500">{errors.order.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Turi</Label>
              <Select value={watch("type")} onValueChange={(v) => setValue("type", v as "restaurant" | "market")}>
                <SelectTrigger>
                  <SelectValue>
                    {watch("type") === "market" ? "Market" : "Restoran"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restaurant">Restoran</SelectItem>
                  <SelectItem value="market">Market</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

          {!isEdit && (
            <div className="border-t pt-4 mt-4">
              <div className="space-y-2">
                <Label>Egasi telefon raqami *</Label>
                <Input {...register("owner_phone")} placeholder="+998901234567" />
                {errors.owner_phone && <p className="text-xs text-red-500">{errors.owner_phone.message}</p>}
                <p className="text-xs text-muted-foreground">Restoran panelga kirish uchun telefon raqam</p>
              </div>
            </div>
          )}

          {isEdit && (
            <div className="border-t pt-4 mt-4">
              <div className="space-y-2">
                <Label>Egasi telefon raqami</Label>
                <Input {...register("owner_phone")} placeholder="+998901234567" />
                {errors.owner_phone && <p className="text-xs text-red-500">{errors.owner_phone.message}</p>}
                <p className="text-xs text-muted-foreground">Bo'sh qoldirsangiz o'zgartirilmaydi</p>
              </div>
            </div>
          )}

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
