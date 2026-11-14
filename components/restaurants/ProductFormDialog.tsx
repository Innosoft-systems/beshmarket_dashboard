/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { X, Upload, Lock, RotateCcw, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createProductAction, unlockProductSyncFieldsAction, updateProductAction } from "@/lib/actions/products"
import {
  createMyProductAction,
  unlockMyProductSyncFieldsAction,
  updateMyProductAction,
} from "@/lib/actions/restaurant-panel"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  LOCKABLE_FIELD_LABELS,
  NO_SYNC_FLAGS,
  hiddenBySyncLabel,
  isPriceLocked,
  isSyncedProduct,
  lockedFields,
  unlockConfirmText,
  type LockableField,
  type SyncFlags,
} from "@/lib/product-sync"
import { getFullImgUrl } from "@/lib/utils"
import { OptionTypesEditor, type LocalOptionType } from "./OptionTypesEditor"
import { VariantEditor, type LocalVariant } from "./VariantEditor"
import { ModifierGroupsEditor, type LocalModifierGroup } from "./ModifierGroupsEditor"

interface Props {
  product?: any
  restaurantId: string
  categories: any[]
  onClose: () => void
  /**
   * Saqlangandan keyin chaqiriladi. Ro'yxat endi mijoz tomonida turadi va
   * sahifalab yuklanadi, shuning uchun `router.refresh()` o'zi yetmaydi —
   * u eski jadval atrofidagi sarlavhani yangilaydi, xolos.
   */
  onSaved?: () => void
  scope?: "admin" | "restaurant"
  /** What 1C manages for this venue (A4); only matters for 1C products. */
  syncFlags?: SyncFlags
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

function initModifierGroups(product?: any): LocalModifierGroup[] {
  if (!product?.modifier_groups?.length) return []
  return product.modifier_groups.map((g: any) => ({
    localId: g._id?.toString() || `g_${Math.random()}`,
    _id: g._id?.toString(),
    name_uz: g.name_uz || "",
    name_ru: g.name_ru || "",
    name_en: g.name_en || "",
    is_required: g.is_required ?? false,
    min_select: (g.min_select ?? 0).toString(),
    max_select: (g.max_select ?? 0).toString(),
    options: (g.options || []).map((o: any) => ({
      localId: o._id?.toString() || `o_${Math.random()}`,
      _id: o._id?.toString(),
      name_uz: o.name_uz || "",
      name_ru: o.name_ru || "",
      name_en: o.name_en || "",
      price: (o.price ?? 0).toString(),
      max_quantity: (o.max_quantity ?? 1).toString(),
      // null/undefined means "not tracked" — keep the field empty, not "0",
      // which would mean "out of stock".
      stock: o.stock === null || o.stock === undefined ? "" : o.stock.toString(),
      is_active: o.is_active ?? true,
    })),
  }))
}

export function ProductFormDialog({
  product,
  restaurantId,
  categories,
  onClose,
  onSaved,
  scope = "admin",
  syncFlags = NO_SYNC_FLAGS,
}: Props) {
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
  const [modifierGroups, setModifierGroups] = useState<LocalModifierGroup[]>(() =>
    initModifierGroups(product),
  )

  useEffect(() => () => { uploadAbortRef.current?.abort() }, [])

  // 1C product (B5): locked fields are kept by the sync; price is read-only while 1C manages it.
  const synced = isSyncedProduct(product)
  const priceLocked = isPriceLocked(product, syncFlags)
  const [locked, setLocked] = useState<LockableField[]>(() => lockedFields(product))
  const [unlockField, setUnlockField] = useState<LockableField | null>(null)
  const [unlocking, setUnlocking] = useState(false)

  const unlock = async () => {
    if (!unlockField || !product) return
    setUnlocking(true)
    const r = scope === "restaurant"
      ? await unlockMyProductSyncFieldsAction(product._id, [unlockField])
      : await unlockProductSyncFieldsAction(product._id, [unlockField])
    setUnlocking(false)
    if (!r.success) {
      setUnlockField(null)
      toast.error(r.error)
      return
    }
    const field = unlockField
    setLocked(prev => prev.filter(f => f !== field))
    setUnlockField(null)
    toast.success(`"${LOCKABLE_FIELD_LABELS[field]}" 1C ga qaytarildi`)
    onSaved?.()
  }

  /** Label with the lock / "1C dan olish" control for a lockable field of a 1C product. */
  const lockLabel = (field: LockableField, text: string) => (
    <div className="flex min-h-5 items-center justify-between gap-2">
      <Label>{text}</Label>
      {synced && locked.includes(field) && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" aria-label="Qo'lda o'zgartirilgan, 1C yangilamaydi" />
          <button
            type="button"
            className="inline-flex items-center gap-0.5 text-primary hover:underline"
            onClick={() => setUnlockField(field)}
            aria-label={`${LOCKABLE_FIELD_LABELS[field]}: 1C dan olish`}
          >
            <RotateCcw className="h-3 w-3" /> 1C dan olish
          </button>
        </span>
      )}
    </div>
  )

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

    for (const group of modifierGroups) {
      if (!group.name_uz.trim()) {
        return toast.error("Har bir qo'shimchalar guruhida nom bo'lishi kerak")
      }
      const named = group.options.filter(o => o.name_uz.trim())
      if (!named.length) {
        return toast.error(`"${group.name_uz}" guruhida kamida 1 ta tanlov kerak`)
      }
      if (named.some(o => Number(o.price) < 0)) {
        return toast.error(`"${group.name_uz}" guruhida narx manfiy bo'lishi mumkin emas`)
      }
      const max = Number(group.max_select) || 0
      const min = Number(group.min_select) || 0
      if (max > 0 && min > max) {
        return toast.error(`"${group.name_uz}": "kamida" qiymati "ko'pi bilan"dan katta`)
      }
      if (max > named.length) {
        return toast.error(
          `"${group.name_uz}": ko'pi bilan ${max} ta, lekin faqat ${named.length} ta tanlov bor`,
        )
      }
    }

    const body: Record<string, unknown> = {
      ...form,
      restaurant_id: restaurantId,
      // A 1C product keeps the slug the sync made (rebuilding it from a Cyrillic name gives "").
      slug: synced ? undefined : slug(form.name_uz) || slug(form.name_ru),
      price: hasVariants ? undefined : +form.price,
      discount_price: (!hasVariants && form.discount_price) ? +form.discount_price : undefined,
    }

    if (hasVariants) {
      body.option_types = optionTypes.map(ot => ({
        name_uz: ot.name_uz || undefined,
        name_ru: ot.name_ru || undefined,
        name_en: ot.name_en || undefined,
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

    // Modifier groups are independent of the variant matrix — a product can have
    // add-ons with or without sizes.
    body.modifier_groups = modifierGroups.map((g, gi) => ({
      ...(g._id ? { _id: g._id } : {}),
      name_uz: g.name_uz,
      name_ru: g.name_ru || g.name_uz,
      name_en: g.name_en || g.name_uz,
      is_required: g.is_required,
      min_select: Number(g.min_select) || 0,
      max_select: Number(g.max_select) || 0,
      is_active: true,
      sort_order: gi,
      options: g.options.map((o, oi) => ({
        ...(o._id ? { _id: o._id } : {}),
        name_uz: o.name_uz,
        name_ru: o.name_ru || o.name_uz,
        name_en: o.name_en || o.name_uz,
        price: Number(o.price) || 0,
        max_quantity: Number(o.max_quantity) || 0,
        // Empty means "stock not tracked" — send null, not 0.
        stock: o.stock.trim() === "" ? null : Number(o.stock),
        is_active: o.is_active,
        sort_order: oi,
      })),
    }))

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
      onSaved?.()
      onClose()
    } else toast.error(result.error)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
      <div className="bg-background rounded-xl shadow-lg ring-1 ring-foreground/10 w-full max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
          <h2 className="font-semibold">{product ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-6 space-y-5">
          {synced && (
            <div role="note" className="flex gap-2 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">Bu mahsulot 1C dan keladi</p>
                <p className="text-xs">
                  Nom, tavsif, rasm yoki kategoriyani o&apos;zgartirsangiz, 1C ularni endi yangilamaydi (qulf belgisi).
                  &quot;1C dan olish&quot; bilan yana 1C ga qaytarasiz.
                  {priceLocked && " Narx 1C dan boshqariladi va bu yerda o'zgarmaydi."}
                  {" "}Mahsulotni o&apos;chirib bo&apos;lmaydi, faqat yashirish mumkin.
                </p>
                {hiddenBySyncLabel(product) && (
                  <p className="text-xs font-medium">1C sababli yashirilgan: {hiddenBySyncLabel(product)}</p>
                )}
              </div>
            </div>
          )}

          {/* Category */}
          <div className="space-y-1.5">
            {lockLabel("menu_category_id", "Kategoriya *")}
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
                {lockLabel(`name_${lang}` as LockableField, `Nomi (${lang.toUpperCase()}) *`)}
                <Input value={(form as any)[`name_${lang}`]}
                  onChange={e => setForm({ ...form, [`name_${lang}`]: e.target.value })} />
              </div>
            ))}
          </div>

          {/* Descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {["uz", "ru", "en"].map(lang => (
              <div key={lang} className="space-y-1.5">
                {lockLabel(`description_${lang}` as LockableField, `Tavsif (${lang.toUpperCase()})`)}
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
                disabled={priceLocked}
                onChange={e => {
                  setHasVariants(e.target.checked)
                  if (!e.target.checked) { setOptionTypes([]); setVariants([]) }
                }}
                className="h-4 w-4 rounded"
              />
              <span className="font-medium text-sm">Bir necha xili bor (0.5L, 1L, 2L...)</span>
            </label>

            {!hasVariants && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="product-price">Narx (so&apos;m) *</Label>
                  <Input id="product-price" type="number" value={form.price} readOnly={priceLocked}
                    aria-describedby={priceLocked ? "price-managed-hint" : undefined}
                    className={priceLocked ? "bg-muted" : undefined}
                    onChange={e => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="product-discount-price">Aksiya narxi</Label>
                  <Input id="product-discount-price" type="number" value={form.discount_price} readOnly={priceLocked}
                    aria-describedby={priceLocked ? "price-managed-hint" : undefined}
                    className={priceLocked ? "bg-muted" : undefined}
                    onChange={e => setForm({ ...form, discount_price: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Og&apos;irlik</Label>
                  <Input placeholder="500g" value={form.weight}
                    onChange={e => setForm({ ...form, weight: e.target.value })} />
                </div>
              </div>
            )}

            {priceLocked && (
              <p id="price-managed-hint" className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" /> 1C dan boshqariladi: narxni 1C da o&apos;zgartiring.
              </p>
            )}
            {synced && syncFlags.stock_managed && (
              <p className="text-sm">
                Qoldiq (1C): <span className="font-medium">{product?.stock ?? "kuzatilmaydi"}</span>
              </p>
            )}

            {hasVariants && (
              <div className="space-y-5">
                <div>
                  <Label className="mb-2 block">1. Tanlov turlari</Label>
                  <OptionTypesEditor optionTypes={optionTypes} onChange={setOptionTypes} />
                </div>
                <div>
                  <Label className="mb-2 block">2. Narxlar</Label>
                  <VariantEditor optionTypes={optionTypes} variants={variants} onChange={setVariants} />
                </div>
              </div>
            )}

            <div className="space-y-2 border-t pt-5">
              <Label className="block">Qo&apos;shimchalar</Label>
              <ModifierGroupsEditor groups={modifierGroups} onChange={setModifierGroups} />
            </div>
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
            {lockLabel("images", "Rasmlar")}
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

        <ConfirmDialog
          open={unlockField !== null}
          onOpenChange={open => { if (!open) setUnlockField(null) }}
          title="1C dan olish"
          description={unlockField ? unlockConfirmText(unlockField) : ""}
          confirmLabel="1C ga qaytarish"
          cancelLabel="Ortga"
          variant="default"
          loading={unlocking}
          onConfirm={unlock}
        />

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
