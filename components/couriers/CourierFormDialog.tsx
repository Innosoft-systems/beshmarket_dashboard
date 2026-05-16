"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { courierFormSchema, CourierFormValues } from "@/schemas"
import { createCourierAction } from "@/lib/actions/couriers"

const VEHICLE_TYPES = [
  { value: "bicycle", label: "Velosiped" },
  { value: "motorcycle", label: "Mototsikl" },
  { value: "car", label: "Avtomobil" },
  { value: "on_foot", label: "Piyoda" },
]

interface CourierFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CourierFormDialog({ open, onOpenChange, onSuccess }: CourierFormDialogProps) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<CourierFormValues>({
    resolver: zodResolver(courierFormSchema) as any,
    defaultValues: {
      full_name: "",
      phone: "",
      vehicle_type: "",
      vehicle_number: "",
      city: "Toshkent",
    },
  })

  useEffect(() => {
    if (open) reset()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: CourierFormValues) => {
    setLoading(true)
    const result = await createCourierAction(data)
    setLoading(false)

    if (result.success) {
      toast.success("Kuryer qo'shildi")
      onOpenChange(false)
      onSuccess()
    } else {
      toast.error(result.error || "Xatolik yuz berdi")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="!max-w-lg">
        <DialogHeader>
          <DialogTitle>Yangi kuryer qo'shish</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Ism *</Label>
            <Input {...register("full_name")} placeholder="To'liq ism" />
            {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Telefon *</Label>
            <Input {...register("phone")} placeholder="+998901234567" />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
            <p className="text-xs text-muted-foreground">Kuryer ilovaga kirish uchun telefon raqam</p>
          </div>

          <div className="space-y-2">
            <Label>Transport turi *</Label>
            <Select value={watch("vehicle_type")} onValueChange={(v) => setValue("vehicle_type", v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {VEHICLE_TYPES.find((t) => t.value === watch("vehicle_type"))?.label || "Tanlang..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.vehicle_type && <p className="text-xs text-red-500">{errors.vehicle_type.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Transport raqami</Label>
              <Input {...register("vehicle_number")} placeholder="01A123BC" />
            </div>
            <div className="space-y-2">
              <Label>Shahar *</Label>
              <Input {...register("city")} placeholder="Toshkent" />
              {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saqlanmoqda..." : "Qo'shish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
