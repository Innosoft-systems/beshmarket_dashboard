/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type LocalOptionValue = { localId: string; name_uz: string; name_ru: string; name_en: string }
export type LocalOptionType = { name_uz: string; name_ru: string; name_en: string; values: LocalOptionValue[] }

interface Props {
  optionTypes: LocalOptionType[]
  onChange: (types: LocalOptionType[]) => void
}

let counter = 0
const tempId = () => `t_${++counter}_${Date.now()}`

export function OptionTypesEditor({ optionTypes, onChange }: Props) {
  const addType = () => {
    onChange([...optionTypes, { name_uz: "", name_ru: "", name_en: "", values: [] }])
  }

  const removeType = (i: number) => {
    onChange(optionTypes.filter((_, idx) => idx !== i))
  }

  const updateType = (i: number, field: keyof Omit<LocalOptionType, "values">, val: string) => {
    const updated = [...optionTypes]
    updated[i] = { ...updated[i], [field]: val }
    onChange(updated)
  }

  const addValue = (typeIdx: number) => {
    const updated = [...optionTypes]
    updated[typeIdx] = {
      ...updated[typeIdx],
      values: [...updated[typeIdx].values, { localId: tempId(), name_uz: "", name_ru: "", name_en: "" }],
    }
    onChange(updated)
  }

  const removeValue = (typeIdx: number, valIdx: number) => {
    const updated = [...optionTypes]
    updated[typeIdx] = {
      ...updated[typeIdx],
      values: updated[typeIdx].values.filter((_, idx) => idx !== valIdx),
    }
    onChange(updated)
  }

  const updateValue = (typeIdx: number, valIdx: number, field: keyof Omit<LocalOptionValue, "localId">, val: string) => {
    const updated = [...optionTypes]
    const values = [...updated[typeIdx].values]
    values[valIdx] = { ...values[valIdx], [field]: val }
    updated[typeIdx] = { ...updated[typeIdx], values }
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      {optionTypes.map((ot, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">{i + 1}-farq turi</span>
              <p className="text-xs text-muted-foreground">Mahsulot nimasi bilan farqlanadi? (hajmi, ta&apos;mi, rangi...)</p>
            </div>
            <Button type="button" variant="ghost" size="sm" className="text-red-500 h-7 px-2" onClick={() => removeType(i)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(["uz", "ru", "en"] as const).map(lang => (
              <div key={lang} className="space-y-1">
                <Label className="text-xs">Nomi ({lang.toUpperCase()})</Label>
                <Input
                  className="h-8 text-sm"
                  placeholder={lang === "uz" ? "Ta'm" : lang === "ru" ? "Вкус" : "Flavor"}
                  value={(ot as any)[`name_${lang}`]}
                  onChange={e => updateType(i, `name_${lang}` as any, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div>
              <Label className="text-xs font-medium">Tanlovlar</Label>
              <p className="text-xs text-muted-foreground">Mijoz nima tanlaydi? Har biri alohida qator</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {ot.values.map((v, vi) => (
                <div key={v.localId} className="flex items-center gap-1 border rounded-md px-2 py-1 bg-muted/30">
                  <Input
                    className="h-6 text-xs w-20 border-0 bg-transparent p-0 focus-visible:ring-0"
                    placeholder="0.5L"
                    value={v.name_uz}
                    onChange={e => {
                      const val = e.target.value
                      const updated = [...optionTypes]
                      const values = [...updated[i].values]
                      values[vi] = { ...values[vi], name_uz: val, name_ru: val, name_en: val }
                      updated[i] = { ...updated[i], values }
                      onChange(updated)
                    }}
                  />
                  <button type="button" className="text-muted-foreground hover:text-red-500 shrink-0" onClick={() => removeValue(i, vi)}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => addValue(i)}>
              <Plus className="h-3 w-3 mr-1" /> Tanlov qo&apos;shish
            </Button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addType}>
        <Plus className="h-4 w-4 mr-1" /> Farq turi qo&apos;shish (hajm, ta&apos;m, rang...)
      </Button>
    </div>
  )
}
