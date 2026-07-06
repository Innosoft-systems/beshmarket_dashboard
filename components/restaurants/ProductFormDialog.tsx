/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { X, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createProductAction, updateProductAction } from "@/lib/actions/products"
import { createMyProductAction, updateMyProductAction } from "@/lib/actions/restaurant-panel"
import { getFullImgUrl } from "@/lib/utils"
import { OptionTypesEditor, type LocalOptionType } from "./OptionTypesEditor"
import { VariantEditor, type LocalVariant } from "./VariantEditor"

interface Props {
  product?: any
  restaurantId: string
  categories: any[]
  onClose: () => void
  scope?: "admin" | "restaurant"
}

function initOptionTypes(product?: any): LocalOptionType[] {
  if (!product?.option_types?.length) return []
  return product.option_types.map((ot: any) => ({
    name_uz: ot.name_uz || "",
    name_ru: ot.name_ru || "",
    name_en: ot.name_en || "",
    values: (ot.values || []).map((v: any) => ({
      localId: v._id || v.localId || `existing_${Math.random()}`,
      name_uz: v.name_uz || "",
      name_ru: v.name_ru || "",
      name_en: v.name_en || "",
    })),
  }))
}

function initVariants(product?: any): LocalVariant[] {
  if (!product?.variants?.length) return []
  return product.variants.map((v: any, i: number) => ({
    localIds: (v.option_value_ids || []).map((id: any) => id?.toString() || id),
    price: v.price?.toString() ?? "",
    discount_price: v.discount_price?.toString() ?? "",
    stock: v.stock?.toString() ?? "0",
    image: v.image ?? "",
    is_active: v.is_active ?? true,
    is_default: v.is_default ?? i === 0,
    sort_order: v.sort_order ?? i,
  }))
}

export function ProductFormDialog({ product, restaurantId, categories, onClose, scope = "admin" }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const uploadAbortRef = useRef<AbortController | null>(null)

  const [hasVariants, setHasVariants] = useState(() =>
    !!(product?.variants?.length || product?.option_types?.length)
  )
  const [optionTypes, setOptionTypes] = useState<LocalOptionType[]>(() => initOptionTypes(product))
  const [variants, setVariants] = useState<LocalVariant[]>(() => initVariants(product))

  useEffect(() => () => { uploadAbortRef.current?.abort() }, [])

  const [form, setForm] = useState({
    name_uz: product?.name_uz || "",
    name_ru: product?.name_ru || "",
    name_en: product?.name_en || "",
    description_uz: product?.description_uz || "",
    description_ru: product?.description_ru || "",
    description_en: product?.description_en || "",
    price: product?.price || "",
    discount_price: product?.discount_price || "",
    weight: product?.weight || "",
    menu_category_id: product?.menu_category_id?._id || product?.menu_category_id || "",
    images: product?.images || [] as string[],
    is_active: product?.is_active ?? true,
    is_available: product?.is_available ?? true,
  })

  const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")

  const uploadImage = async (file: File) => {
    setUploading(true)
    uploadAbortRef.current?.abort()
    uploadAbortRef.current = new AbortController()
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd, signal: uploadAbortRef.current.signal })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Xatolik")
      const url: string = json.data?.url || json.url || ""
      if (url) setForm(f => ({ ...f, images: [...f.images, url] }))
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return
      toast.error("Rasm yuklanmadi")
    }
    setUploading(false)
  }

  const handleSubmit = async () => {
    if (!form.name_uz || !form.menu_category_id)
      return toast.error("Nom va kategoriya majburiy")

    if (hasVariants) {
      if (!optionTypes.length) return toast.error("Kamida 1 ta option turi kerak")
      if (!variants.length) return toast.error("Kamida 1 ta variant kerak")
      const missingPrice = variants.some(v => !v.price || isNaN(+v.price))
      if (missingPrice) return toast.error("Barcha variantlarda narx kiritilishi shart")
    } else {
      if (!form.price) return toast.error("Narx majburiy")
    }

    const body: Record<string, unknown> = {
      ...form,
      restaurant_id: restaurantId,
      slug: slug(form.name_uz) || slug(form.name_ru),
      price: hasVariants ? undefined : +form.price,
      discount_price: (!hasVariants && form.discount_price) ? +form.discount_price : undefined,
    }

    if (hasVariants) {
      body.option_types = optionTypes.map(ot => ({
        name_uz: ot.name_uz,
        name_ru: ot.name_ru,
        name_en: ot.name_en,
        values: ot.values.map(v => ({
          _id: v.localId,
          name_uz: v.name_uz,
          name_ru: v.name_ru,
          name_en: v.name_en,
        })),
      }))
      body.variants = variants.map((v, i) => ({
        option_value_ids: v.localIds,
        price: +v.price,
        discount_price: v.discount_price ? +v.discount_price : undefined,
        stock: +v.stock || 0,
        image: v.image || undefined,
        is_active: v.is_active,
        is_default: v.is_default,
        sort_order: i,
      }))
    } else {
      body.option_types = []
      body.variants = []
    }

    setLoading(true)
    const result = product
      ? scope === "restaurant"
        ? await updateMyProductAction(product._id, body)
        : await updateProductAction(product._id, body)
      : scope === "restaurant"
        ? await createMyProductAction(body)
        : await createProductAction(body)
    setLoading(false)

    if (result.success) {
      toast.success(product ? "Saqlandi" : "Mahsulot qo'shildi")
      startTransition(() => router.refresh())
      onClose()
    } else toast.error(result.error)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
      <div className="bg-background rounded-xl shadow-lg ring-1 ring-foreground/10 w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
          <h2 className="font-semibold">{product ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-6 space-y-5">
          {/* Category */}
          <div className="space-y-1.5">
            <Label>Kategoriya *</Label>
            <Select value={form.menu_category_id}
              onValueChange={(v) => setForm({ ...form, menu_category_id: v ?? form.menu_category_id })}>
              <SelectTrigger>
                <SelectValue>
                  {categories.find(c => c._id === form.menu_category_id)?.name_uz || "Kategoriya tanlang"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c._id} value={c._id}>{c.name_uz}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Names */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {["uz", "ru", "en"].map(lang => (
              <div key={lang} className="space-y-1.5">
                <Label>Nomi ({lang.toUpperCase()}) *</Label>
                <Input value={(form as any)[`name_${lang}`]}
                  onChange={e => setForm({ ...form, [`name_${lang}`]: e.target.value })} />
              </div>
            ))}
          </div>

          {/* Descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {["uz", "ru", "en"].map(lang => (
              <div key={lang} className="space-y-1.5">
                <Label>Tavsif ({lang.toUpperCase()})</Label>
                <Textarea
                  rows={3}
                  value={(form as any)[`description_${lang}`]}
                  onChange={e => setForm({ ...form, [`description_${lang}`]: e.target.value })}
                  placeholder={lang === "uz" ? "Mahsulot haqida..." : lang === "ru" ? "О продукте..." : "About product..."}
                />
              </div>
            ))}
          </div>

          {/* Variant toggle */}
          <div className="border rounded-lg p-4 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasVariants}
                onChange={e => {
                  setHasVariants(e.target.checked)
                  if (!e.target.checked) { setOptionTypes([]); setVariants([]) }
                }}
                className="h-4 w-4 rounded"
              />
              <div>
                <span className="font-medium text-sm">Bu mahsulotda variantlar bor</span>
                <p className="text-xs text-muted-foreground">Masalan: Coca-Cola 1L / 1.5L / 2L yoki Bliss suvi 4 xil ta&apos;m</p>
              </div>
            </label>

            {!hasVariants && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Narx (so&apos;m) *</Label>
                  <Input type="number" value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Aksiya narxi</Label>
                  <Input type="number" value={form.discount_price}
                    onChange={e => setForm({ ...form, discount_price: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Og&apos;irlik</Label>
                  <Input placeholder="500g" value={form.weight}
                    onChange={e => setForm({ ...form, weight: e.target.value })} />
                </div>
              </div>
            )}

            {hasVariants && (
              <div className="space-y-5">
                <div>
                  <Label className="mb-2 block">Option turlari</Label>
                  <OptionTypesEditor optionTypes={optionTypes} onChange={setOptionTypes} />
                </div>
                <div>
                  <Label className="mb-2 block">Variantlar</Label>
                  <VariantEditor optionTypes={optionTypes} variants={variants} onChange={setVariants} />
                </div>
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="flex gap-6">
            {[
              { key: "is_active", label: "Faol" },
              { key: "is_available", label: "Mavjud" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(form as any)[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.checked })}
                  className="h-4 w-4 rounded" />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>

          {/* Images */}
          <div className="space-y-2">
            <Label>Rasmlar</Label>
            <div className="flex flex-wrap gap-2">
              {form.images.map((url: string, i: number) => (
                <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border">
                  <img src={getFullImgUrl(url)} alt={`Mahsulot rasmi ${i + 1}`} className="h-full w-full object-cover" />
                  <button onClick={() => setForm(f => ({ ...f, images: f.images.filter((_: string, j: number) => j !== i) }))}
                    className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5">
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
              <label className="h-20 w-20 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/50">
                <input type="file" accept="image/*" className="hidden" disabled={uploading}
                  onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                <Upload className="h-5 w-5 text-muted-foreground" />
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t sticky bottom-0 bg-background">
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button disabled={loading} onClick={handleSubmit}>
            {loading ? "Saqlanmoqda..." : product ? "Saqlash" : "Qo'shish"}
          </Button>
        </div>
      </div>
    </div>
  )
}
