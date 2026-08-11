"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type LocalModifierOption = {
  localId: string
  _id?: string
  name_uz: string
  name_ru: string
  name_en: string
  price: string
  /** "" or "0" means unlimited. */
  max_quantity: string
  /** "" means the restaurant does not track stock for this option. */
  stock: string
  is_active: boolean
}

export type LocalModifierGroup = {
  localId: string
  _id?: string
  name_uz: string
  name_ru: string
  name_en: string
  is_required: boolean
  min_select: string
  /** "" or "0" means unlimited. */
  max_select: string
  options: LocalModifierOption[]
}

const uid = () => Math.random().toString(36).slice(2, 10)

export const emptyOption = (): LocalModifierOption => ({
  localId: uid(),
  name_uz: "",
  name_ru: "",
  name_en: "",
  price: "",
  max_quantity: "1",
  stock: "",
  is_active: true,
})

export const emptyGroup = (): LocalModifierGroup => ({
  localId: uid(),
  name_uz: "",
  name_ru: "",
  name_en: "",
  is_required: false,
  min_select: "0",
  max_select: "0",
  options: [emptyOption()],
})

interface Props {
  groups: LocalModifierGroup[]
  onChange: (groups: LocalModifierGroup[]) => void
}

export function ModifierGroupsEditor({ groups, onChange }: Props) {
  const patchGroup = (index: number, patch: Partial<LocalModifierGroup>) => {
    onChange(groups.map((g, i) => (i === index ? { ...g, ...patch } : g)))
  }

  const patchOption = (
    groupIndex: number,
    optionIndex: number,
    patch: Partial<LocalModifierOption>,
  ) => {
    onChange(
      groups.map((g, i) =>
        i === groupIndex
          ? {
              ...g,
              options: g.options.map((o, j) =>
                j === optionIndex ? { ...o, ...patch } : o,
              ),
            }
          : g,
      ),
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Bu yerdagi tanlovlar taom narxiga <strong>qo&apos;shiladi</strong> — sous,
        qo&apos;shimcha pishloq, qazi kabi. Ular alohida taom yaratmaydi.
        <br />
        O&apos;lcham yoki hajm uchun esa yuqoridagi{" "}
        <strong>&quot;Bir necha xili bor&quot;</strong> bo&apos;limidan foydalaning —
        u narxni almashtiradi.
      </p>

      {groups.map((group, gi) => {
        const isSingleChoice = group.max_select === "1"
        return (
          <div key={group.localId} className="rounded-lg border p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="grid flex-1 grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Guruh nomi (UZ) *</Label>
                  <Input
                    placeholder="Sous"
                    value={group.name_uz}
                    onChange={e => patchGroup(gi, { name_uz: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nomi (RU)</Label>
                  <Input
                    placeholder="Соус"
                    value={group.name_ru}
                    onChange={e => patchGroup(gi, { name_ru: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nomi (EN)</Label>
                  <Input
                    placeholder="Sauce"
                    value={group.name_en}
                    onChange={e => patchGroup(gi, { name_en: e.target.value })}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-6 shrink-0 text-destructive"
                aria-label="Guruhni o'chirish"
                onClick={() => onChange(groups.filter((_, i) => i !== gi))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Selection rules */}
            <div className="flex flex-wrap items-end gap-4 rounded-md bg-muted/40 p-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded"
                  checked={group.is_required}
                  onChange={e =>
                    patchGroup(gi, {
                      is_required: e.target.checked,
                      // A required group needs at least one pick; default it to
                      // "exactly one", which is what sauces/dough almost always are.
                      min_select: e.target.checked ? "1" : "0",
                      max_select:
                        e.target.checked && group.max_select === "0"
                          ? "1"
                          : group.max_select,
                    })
                  }
                />
                <span className="text-sm font-medium">Majburiy tanlov</span>
              </label>

              <div className="space-y-1.5">
                <Label className="text-xs">Kamida</Label>
                <Input
                  type="number"
                  min={0}
                  className="w-24"
                  value={group.min_select}
                  onChange={e => patchGroup(gi, { min_select: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ko&apos;pi bilan</Label>
                <Input
                  type="number"
                  min={0}
                  className="w-24"
                  placeholder="0"
                  value={group.max_select}
                  onChange={e => patchGroup(gi, { max_select: e.target.value })}
                />
              </div>

              <p className="flex-1 text-xs text-muted-foreground">
                {group.is_required ? "Mijoz tanlamasdan o'tolmaydi" : "Mijoz o'tkazib yuborishi mumkin"}
                {" · "}
                {isSingleChoice ? "bittasini tanlaydi" : "bir nechtasini tanlashi mumkin"}
                {" · "}
                Ko&apos;pi bilan <strong>0</strong> = cheksiz
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <div className="hidden grid-cols-[1fr_1fr_1fr_110px_90px_90px_40px] gap-2 px-1 text-xs text-muted-foreground md:grid">
                <span>Nomi (UZ) *</span>
                <span>Nomi (RU)</span>
                <span>Nomi (EN)</span>
                <span>+ Narx (so&apos;m)</span>
                <span>Max soni</span>
                <span>Ombor</span>
                <span />
              </div>

              {group.options.map((option, oi) => (
                <div
                  key={option.localId}
                  className="grid grid-cols-2 gap-2 md:grid-cols-[1fr_1fr_1fr_110px_90px_90px_40px]"
                >
                  <Input
                    placeholder="Ketchup"
                    value={option.name_uz}
                    onChange={e => patchOption(gi, oi, { name_uz: e.target.value })}
                  />
                  <Input
                    placeholder="Кетчуп"
                    value={option.name_ru}
                    onChange={e => patchOption(gi, oi, { name_ru: e.target.value })}
                  />
                  <Input
                    placeholder="Ketchup"
                    value={option.name_en}
                    onChange={e => patchOption(gi, oi, { name_en: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={option.price}
                    onChange={e => patchOption(gi, oi, { price: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="1"
                    title="Bitta taomga nechta olish mumkin. 0 = cheksiz"
                    value={option.max_quantity}
                    onChange={e => patchOption(gi, oi, { max_quantity: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="∞"
                    title="Bo'sh qoldirilsa ombor hisobga olinmaydi"
                    value={option.stock}
                    onChange={e => patchOption(gi, oi, { stock: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    aria-label="Tanlovni o'chirish"
                    disabled={group.options.length === 1}
                    onClick={() =>
                      patchGroup(gi, {
                        options: group.options.filter((_, j) => j !== oi),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  patchGroup(gi, { options: [...group.options, emptyOption()] })
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Tanlov qo&apos;shish
              </Button>
            </div>

            <GroupPreview group={group} />
          </div>
        )
      })}

      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...groups, emptyGroup()])}
      >
        <Plus className="mr-1 h-4 w-4" />
        Qo&apos;shimchalar guruhi qo&apos;shish
      </Button>
    </div>
  )
}

/** Shows the restaurant admin exactly what the customer will see. */
function GroupPreview({ group }: { group: LocalModifierGroup }) {
  const named = group.options.filter(o => o.name_uz.trim())
  if (!group.name_uz.trim() && !named.length) return null

  const single = group.max_select === "1"
  const max = Number(group.max_select) || 0

  return (
    <div className="rounded-md border border-dashed p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Mijoz shunday ko&apos;radi:
      </p>
      <p className="text-sm font-medium">
        {group.name_uz || "Guruh nomi"}
        {group.is_required && <span className="text-destructive"> *</span>}
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          {group.is_required ? "majburiy" : "ixtiyoriy"}
          {max > 0 ? ` · ko'pi bilan ${max} ta` : " · cheksiz"}
        </span>
      </p>
      <div className="mt-1.5 space-y-1">
        {named.length === 0 ? (
          <p className="text-xs text-muted-foreground">— tanlovlar hali kiritilmagan</p>
        ) : (
          named.map(o => (
            <p key={o.localId} className="text-sm">
              <span className="mr-2 text-muted-foreground">{single ? "○" : "☐"}</span>
              {o.name_uz}
              <span className="ml-2 text-muted-foreground">
                {Number(o.price) > 0
                  ? `+${Number(o.price).toLocaleString()} so'm`
                  : "bepul"}
              </span>
              {Number(o.max_quantity) !== 1 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (max {Number(o.max_quantity) || "∞"} ta)
                </span>
              )}
            </p>
          ))
        )}
      </div>
    </div>
  )
}
