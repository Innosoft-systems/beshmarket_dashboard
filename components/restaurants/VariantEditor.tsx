"use client"

import { useState } from "react"
import { RefreshCw, Trash2, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { getFullImgUrl } from "@/lib/utils"
import { toast } from "sonner"
import type { LocalOptionType } from "./OptionTypesEditor"

export type LocalVariant = {
  localIds: string[]
  price: string
  discount_price: string
  stock: string
  image: string
  is_active: boolean
  is_default: boolean
  sort_order: number
}

interface Props {
  optionTypes: LocalOptionType[]
  variants: LocalVariant[]
  onChange: (variants: LocalVariant[]) => void
}

function cartesian(arrays: string[][]): string[][] {
  if (!arrays.length) return [[]]
  return arrays.reduce<string[][]>((acc, arr) =>
    acc.flatMap(combo => arr.map(v => [...combo, v])), [[]]
  )
}

export function getVariantLabel(variant: LocalVariant, optionTypes: LocalOptionType[]): string {
  return variant.localIds.map(id => {
    for (const ot of optionTypes) {
      const val = ot.values.find(v => v.localId === id)
      if (val) return val.name_uz || id
    }
    return id
  }).join(" / ")
}

export function VariantEditor({ optionTypes, variants, onChange }: Props) {
  const [uploading, setUploading] = useState<number | null>(null)

  const generate = () => {
    const allValues = optionTypes.map(ot => ot.values.map(v => v.localId))
    if (allValues.some(vs => vs.length === 0)) {
      toast.error("Har option turida kamida 1 ta qiymat bo'lishi kerak")
      return
    }
    const combos = cartesian(allValues)
    const existing = new Map(variants.map(v => [v.localIds.sort().join(":"), v]))

    const newVariants: LocalVariant[] = combos.map((localIds, i) => {
      const key = [...localIds].sort().join(":")
      const prev = existing.get(key)
      return prev ?? {
        localIds,
        price: "",
        discount_price: "",
        stock: "0",
        image: "",
        is_active: true,
        is_default: i === 0,
        sort_order: i,
      }
    })
    onChange(newVariants)
  }

  const update = (i: number, field: keyof LocalVariant, val: unknown) => {
    const updated = [...variants]
    updated[i] = { ...updated[i], [field]: val }
    // Only one default
    if (field === "is_default" && val === true) {
      updated.forEach((v, idx) => { if (idx !== i) updated[idx] = { ...v, is_default: false } })
    }
    onChange(updated)
  }

  const remove = (i: number) => {
    const updated = variants.filter((_, idx) => idx !== i)
    if (updated.length && !updated.some(v => v.is_default)) updated[0].is_default = true
    onChange(updated)
  }

  const uploadImage = async (i: number, file: File) => {
    setUploading(i)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Xatolik")
      const url: string = json.data?.url || json.url || ""
      if (url) update(i, "image", url)
    } catch {
      toast.error("Rasm yuklanmadi")
    }
    setUploading(null)
  }

  const canGenerate = optionTypes.length > 0 && optionTypes.every(ot => ot.values.length > 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canGenerate}
          onClick={generate}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Variantlarni yaratish
        </Button>
        {!canGenerate && (
          <span className="text-xs text-muted-foreground">Avval option turlari va qiymatlarini to&apos;ldiring</span>
        )}
      </div>

      {variants.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="h-9 px-3 text-left text-xs font-medium">Variant</th>
                <th className="h-9 px-3 text-left text-xs font-medium">Narx *</th>
                <th className="h-9 px-3 text-left text-xs font-medium">Aksiya</th>
                <th className="h-9 px-3 text-left text-xs font-medium">Stok</th>
                <th className="h-9 px-3 text-left text-xs font-medium">Rasm</th>
                <th className="h-9 px-3 text-center text-xs font-medium">Default</th>
                <th className="h-9 px-3 text-center text-xs font-medium">Faol</th>
                <th className="h-9 px-2" />
              </tr>
            </thead>
            <tbody>
              {variants.map((v, i) => (
                <tr key={v.localIds.join(":")} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="text-xs font-normal whitespace-nowrap">
                      {getVariantLabel(v, optionTypes)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      className="h-7 w-24 text-xs"
                      placeholder="12000"
                      value={v.price}
                      onChange={e => update(i, "price", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      className="h-7 w-24 text-xs"
                      placeholder="—"
                      value={v.discount_price}
                      onChange={e => update(i, "discount_price", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      className="h-7 w-20 text-xs"
                      min={0}
                      value={v.stock}
                      onChange={e => update(i, "stock", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {v.image ? (
                      <div className="relative h-8 w-8">
                        <img src={getFullImgUrl(v.image)} alt="" className="h-8 w-8 rounded object-cover" />
                        <button
                          type="button"
                          className="absolute -top-1 -right-1 bg-black/60 rounded-full p-0.5"
                          onClick={() => update(i, "image", "")}
                        >
                          <X className="h-2.5 w-2.5 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="h-8 w-8 rounded border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/50">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploading === i}
                          onChange={e => e.target.files?.[0] && uploadImage(i, e.target.files[0])}
                        />
                        <Upload className="h-3 w-3 text-muted-foreground" />
                      </label>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="radio"
                      name="is_default"
                      checked={v.is_default}
                      onChange={() => update(i, "is_default", true)}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={v.is_active}
                      onChange={e => update(i, "is_active", e.target.checked)}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button type="button" className="text-muted-foreground hover:text-red-500" onClick={() => remove(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
