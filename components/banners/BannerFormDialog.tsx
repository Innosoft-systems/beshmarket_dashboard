"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageUploader } from "@/components/ui/image-uploader"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Banner } from "@/types"
import { bannerFormSchema, BannerFormValues } from "@/schemas"
import { createBannerAction, updateBannerAction } from "@/lib/actions/banners"

interface BannerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  banner?: Banner | null
  onSuccess: () => void
}

export function BannerFormDialog({
  open,
  onOpenChange,
  banner,
  onSuccess,
}: BannerFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const isEdit = !!banner

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<BannerFormValues>({
    resolver: zodResolver(bannerFormSchema) as any,
    defaultValues: {
      title_uz: banner?.title_uz || "",
      title_ru: banner?.title_ru || "",
      title_en: banner?.title_en || "",
      subtitle_uz: banner?.subtitle_uz || "",
      subtitle_ru: banner?.subtitle_ru || "",
      subtitle_en: banner?.subtitle_en || "",
      image: banner?.image || "",
      link: banner?.link || "",
      sort_order: banner?.sort_order || 0,
    },
  })

  const imageValue = watch("image")

  useEffect(() => {
    if (open) {
      reset({
        title_uz: banner?.title_uz || "",
        title_ru: banner?.title_ru || "",
        title_en: banner?.title_en || "",
        subtitle_uz: banner?.subtitle_uz || "",
        subtitle_ru: banner?.subtitle_ru || "",
        subtitle_en: banner?.subtitle_en || "",
        image: banner?.image || "",
        link: banner?.link || "",
        sort_order: banner?.sort_order || 0,
      })
    }
  }, [open, banner]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: BannerFormValues) => {
    setLoading(true)
    const result = isEdit
      ? await updateBannerAction(banner!._id, data)
      : await createBannerAction({ ...data, is_active: true })
    setLoading(false)

    if (result.success) {
      toast.success(isEdit ? "Banner yangilandi" : "Banner yaratildi")
      reset()
      onOpenChange(false)
      onSuccess()
    } else {
      toast.error(result.error || "Xatolik yuz berdi")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Bannerni tahrirlash" : "Yangi banner"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Rasm *</Label>
            <ImageUploader
              value={imageValue}
              onChange={(url) => setValue("image", url)}
            />
            {errors.image && <p className="text-xs text-red-500">{errors.image.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Sarlavha (UZ) *</Label>
              <Input {...register("title_uz")} placeholder="O'zbekcha" />
              {errors.title_uz && <p className="text-xs text-red-500">{errors.title_uz.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Sarlavha (RU) *</Label>
              <Input {...register("title_ru")} placeholder="Русский" />
              {errors.title_ru && <p className="text-xs text-red-500">{errors.title_ru.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Sarlavha (EN) *</Label>
              <Input {...register("title_en")} placeholder="English" />
              {errors.title_en && <p className="text-xs text-red-500">{errors.title_en.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Qo'shimcha (UZ)</Label>
              <Input {...register("subtitle_uz")} placeholder="Ixtiyoriy" />
            </div>
            <div className="space-y-2">
              <Label>Qo'shimcha (RU)</Label>
              <Input {...register("subtitle_ru")} placeholder="Ixtiyoriy" />
            </div>
            <div className="space-y-2">
              <Label>Qo'shimcha (EN)</Label>
              <Input {...register("subtitle_en")} placeholder="Ixtiyoriy" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Havola (link)</Label>
              <Input {...register("link")} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Tartib raqami</Label>
              <Input {...register("sort_order")} type="number" placeholder="0" />
            </div>
          </div>

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
