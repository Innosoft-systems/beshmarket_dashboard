"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { ChevronDown, ChevronUp } from "lucide-react"
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
import { courierFormSchema, courierDocumentsFormSchema, CourierFormValues, CourierDocumentsFormValues } from "@/schemas"
import { createCourierAction, upsertCourierDocumentsAdminAction } from "@/lib/actions/couriers"

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
  const [docsOpen, setDocsOpen] = useState(false)

  const profileForm = useForm<CourierFormValues>({
    resolver: zodResolver(courierFormSchema) as any,
    defaultValues: { full_name: "", phone: "", vehicle_type: "", vehicle_number: "", city: "Toshkent" },
  })

  const docsForm = useForm<CourierDocumentsFormValues>({
    resolver: zodResolver(courierDocumentsFormSchema) as any,
    defaultValues: {
      birth_date: "", gender: undefined, address: "",
      passport_series: "", passport_number: "",
      passport_issued_date: "", passport_expiry_date: "",
      driver_license_number: "", driver_license_expiry: "",
    },
  })

  useEffect(() => {
    if (open) {
      profileForm.reset()
      docsForm.reset()
      setDocsOpen(false)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (profileData: CourierFormValues) => {
    const docsData = docsForm.getValues()
    const docsValid = await docsForm.trigger()

    if (!docsValid) return

    setLoading(true)
    const result = await createCourierAction(profileData)

    if (!result.success) {
      setLoading(false)
      toast.error(result.error || "Xatolik yuz berdi")
      return
    }

    // Hujjat ma'lumotlari kiritilgan bo'lsa, yuborish
    const hasPassport = docsData.passport_series?.trim() && docsData.passport_number?.trim()
    const hasAnyDoc = hasPassport || docsData.birth_date || docsData.gender || docsData.address ||
      docsData.driver_license_number || docsData.passport_issued_date

    if (hasAnyDoc && result.id) {
      const cleanDocs: Record<string, string | undefined> = {}
      if (docsData.birth_date) cleanDocs.birth_date = docsData.birth_date
      if (docsData.gender) cleanDocs.gender = docsData.gender
      if (docsData.address) cleanDocs.address = docsData.address
      if (docsData.passport_series) cleanDocs.passport_series = docsData.passport_series
      if (docsData.passport_number) cleanDocs.passport_number = docsData.passport_number
      if (docsData.passport_issued_date) cleanDocs.passport_issued_date = docsData.passport_issued_date
      if (docsData.passport_expiry_date) cleanDocs.passport_expiry_date = docsData.passport_expiry_date
      if (docsData.driver_license_number) cleanDocs.driver_license_number = docsData.driver_license_number
      if (docsData.driver_license_expiry) cleanDocs.driver_license_expiry = docsData.driver_license_expiry

      await upsertCourierDocumentsAdminAction(result.id, cleanDocs as any)
    }

    setLoading(false)
    toast.success("Kuryer qo'shildi")
    onOpenChange(false)
    onSuccess()
  }

  const { register: rp, handleSubmit, setValue: sp, watch: wp, formState: { errors: ep } } = profileForm
  const { register: rd, setValue: sd, watch: wd, formState: { errors: ed } } = docsForm

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { profileForm.reset(); docsForm.reset() }; onOpenChange(v) }}>
      <DialogContent className="!max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yangi kuryer qo&apos;shish</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Asosiy */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Asosiy ma&apos;lumotlar</p>

            <div className="space-y-2">
              <Label>Ism *</Label>
              <Input {...rp("full_name")} placeholder="To'liq ism" />
              {ep.full_name && <p className="text-xs text-red-500">{ep.full_name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Telefon *</Label>
              <Input {...rp("phone")} placeholder="+998901234567" />
              {ep.phone && <p className="text-xs text-red-500">{ep.phone.message}</p>}
              <p className="text-xs text-muted-foreground">Kuryer ilovaga kirish uchun</p>
            </div>

            <div className="space-y-2">
              <Label>Transport turi *</Label>
              <Select value={wp("vehicle_type")} onValueChange={(v) => sp("vehicle_type", v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {VEHICLE_TYPES.find((t) => t.value === wp("vehicle_type"))?.label || "Tanlang..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {ep.vehicle_type && <p className="text-xs text-red-500">{ep.vehicle_type.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Transport raqami</Label>
                <Input {...rp("vehicle_number")} placeholder="01A123BC" />
              </div>
              <div className="space-y-2">
                <Label>Shahar *</Label>
                <Input {...rp("city")} placeholder="Toshkent" />
                {ep.city && <p className="text-xs text-red-500">{ep.city.message}</p>}
              </div>
            </div>
          </div>

          {/* Hujjatlar — collapsible */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium bg-muted/40 hover:bg-muted/60 transition-colors"
              onClick={() => setDocsOpen((v) => !v)}
            >
              <span>Hujjatlar <span className="text-muted-foreground font-normal">(ixtiyoriy)</span></span>
              {docsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {docsOpen && (
              <div className="p-4 space-y-4">
                {/* Shaxsiy */}
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Shaxsiy</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tug&apos;ilgan sana</Label>
                    <Input type="date" {...rd("birth_date")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Jins</Label>
                    <Select value={wd("gender") || ""} onValueChange={(v) => sd("gender", v as "male" | "female")}>
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {wd("gender") === "male" ? "Erkak" : wd("gender") === "female" ? "Ayol" : "Tanlang..."}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Erkak</SelectItem>
                        <SelectItem value="female">Ayol</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Yashash manzili</Label>
                  <Input {...rd("address")} placeholder="Toshkent sh., Yunusobod tumani, ..." />
                </div>

                {/* Passport */}
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1">Passport</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Seriya</Label>
                    <Input {...rd("passport_series")} placeholder="AA" maxLength={2} className="uppercase" />
                  </div>
                  <div className="space-y-2">
                    <Label>Raqam</Label>
                    <Input {...rd("passport_number")} placeholder="1234567" maxLength={7} />
                    {ed.passport_number && <p className="text-xs text-red-500">{ed.passport_number.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Berilgan sana</Label>
                    <Input type="date" {...rd("passport_issued_date")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Muddati</Label>
                    <Input type="date" {...rd("passport_expiry_date")} />
                  </div>
                </div>

                {/* Haydovchilik */}
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1">Haydovchilik guvohnomasi</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Guvohnoma №</Label>
                    <Input {...rd("driver_license_number")} placeholder="12AB345678" />
                  </div>
                  <div className="space-y-2">
                    <Label>Muddati</Label>
                    <Input type="date" {...rd("driver_license_expiry")} />
                  </div>
                </div>
              </div>
            )}
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
