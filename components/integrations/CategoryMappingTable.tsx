"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Info, Loader2, RefreshCw, Search } from "lucide-react"

import { getCategoryMapsAction, putCategoryMapAction } from "@/lib/actions/integrations"
import { updateMenuCategoryAction } from "@/lib/actions/products"
import {
  AUTO_CHOICE,
  IGNORE_CHOICE,
  applyChoice,
  categoryChoice,
  choiceToBody,
  formatGroupPath,
} from "@/lib/integrations"
import type { CategoriesData, CategoryMap, CategoryMenuOption } from "@/types/integration"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const AUTO_LABEL = "Avtomatik"
const IGNORE_LABEL = "Import qilinmasin"

/**
 * 1C group → menu category mapping (plan A3, §3.3). Each change is a PUT for
 * that one row, applied optimistically and rolled back if the server refuses.
 * Changes take effect at the next sync (no retro move of products).
 */
export function CategoryMappingTable({ connectionId }: { connectionId: string }) {
  const [data, setData] = useState<CategoriesData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingGroups, setSavingGroups] = useState<Set<string>>(new Set())
  const [savingCategories, setSavingCategories] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getCategoryMapsAction(connectionId)
    if (res.success) {
      setData(res.data)
      setLoadError(null)
    } else {
      setLoadError(res.error)
    }
    setLoading(false)
  }, [connectionId])

  useEffect(() => {
    // Fetch on mount; setState happens after the await, not synchronously in the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const menuById = useMemo(
    () => new Map((data?.menu_categories ?? []).map((m) => [m._id, m] as const)),
    [data?.menu_categories],
  )

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const maps = [...(data?.maps ?? [])].sort((a, b) => formatGroupPath(a).localeCompare(formatGroupPath(b)))
    return q ? maps.filter((m) => formatGroupPath(m).toLowerCase().includes(q)) : maps
  }, [data?.maps, query])

  const oneCCategories = useMemo(
    () => (data?.menu_categories ?? []).filter((m) => m.source === "1c"),
    [data?.menu_categories],
  )

  const setRow = (groupId: string, next: CategoryMap) =>
    setData((prev) => (prev ? { ...prev, maps: prev.maps.map((m) => (m.group_id === groupId ? next : m)) } : prev))

  const mark = (setter: typeof setSavingGroups, id: string, on: boolean) =>
    setter((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const changeMapping = async (map: CategoryMap, choice: string) => {
    if (choice === categoryChoice(map)) return
    const previous = map
    setRow(map.group_id, applyChoice(map, choice))
    mark(setSavingGroups, map.group_id, true)
    const res = await putCategoryMapAction(connectionId, map.group_id, choiceToBody(choice))
    mark(setSavingGroups, map.group_id, false)
    if (!res.success) {
      setRow(map.group_id, previous)
      toast.error(res.error)
      return
    }
    // Keep the path/count we already show if the server answers with a partial row.
    setRow(map.group_id, { ...previous, ...res.data })
  }

  const toggleCategory = async (cat: CategoryMenuOption, isActive: boolean) => {
    const setActive = (value: boolean) =>
      setData((prev) =>
        prev
          ? {
              ...prev,
              menu_categories: prev.menu_categories.map((m) => (m._id === cat._id ? { ...m, is_active: value } : m)),
            }
          : prev,
      )
    setActive(isActive)
    mark(setSavingCategories, cat._id, true)
    const res = await updateMenuCategoryAction(cat._id, { is_active: isActive })
    mark(setSavingCategories, cat._id, false)
    if (!res.success) {
      setActive(!isActive)
      toast.error(res.error ?? "Xatolik yuz berdi")
      return
    }
    toast.success(isActive ? `"${cat.name_uz}" faollashtirildi` : `"${cat.name_uz}" yashirildi`)
  }

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Kategoriyalar yuklanmoqda...
        </CardContent>
      </Card>
    )
  }

  if (loadError && !data) {
    return (
      <Card>
        <CardContent className="space-y-3 py-8 text-sm">
          <p className="text-destructive">Kategoriyalarni yuklab bo&apos;lmadi: {loadError}</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Qayta urinish
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">1C guruhlari</CardTitle>
            <CardDescription>
              Har bir 1C guruhini menyu kategoriyasiga bog&apos;lang, avtomatik qoldiring yoki import qilmang.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading} className="gap-1.5 self-start">
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Yangilash
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data?.maps.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">1C hali guruh yubormagan.</p>
          ) : (
            <>
              <div className="relative sm:max-w-sm">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Guruh bo'yicha qidirish"
                  aria-label="Guruh bo'yicha qidirish"
                  className="pl-8"
                />
              </div>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-56">1C guruhi</TableHead>
                      <TableHead className="w-24 text-right">Mahsulot</TableHead>
                      <TableHead className="min-w-64">Menyu kategoriyasi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((map) => (
                      <MappingRow
                        key={map.group_id}
                        map={map}
                        menuCategories={data?.menu_categories ?? []}
                        menuById={menuById}
                        saving={savingGroups.has(map.group_id)}
                        onChange={(choice) => void changeMapping(map, choice)}
                      />
                    ))}
                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                          Hech narsa topilmadi.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            O&apos;zgarish keyingi sinxronlashda qo&apos;llanadi. &quot;{AUTO_LABEL}&quot;: ulanish sozlamasidagi
            kategoriya darajasi bo&apos;yicha. &quot;{IGNORE_LABEL}&quot;: bu guruh mahsulotlari qabul qilinmaydi, borlari
            keyingi to&apos;liq sinxronlashda yashiriladi.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1C yaratgan kategoriyalar</CardTitle>
          <CardDescription>
            Avtomatik yaratilgan kategoriyalar ko&apos;rib chiqilmaguncha yashirin turadi. Tekshirib, faollashtiring.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {oneCCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hozircha yo&apos;q.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {oneCCategories.map((cat) => (
                <li key={cat._id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <span className="min-w-0 truncate">
                    {cat.name_uz}
                    {!cat.is_active && (
                      <Badge variant="secondary" className="ml-2">
                        Yashirin
                      </Badge>
                    )}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground" aria-hidden="true">
                      Faollashtirish
                    </span>
                    <Switch
                      checked={cat.is_active}
                      disabled={savingCategories.has(cat._id)}
                      onCheckedChange={(v) => void toggleCategory(cat, v)}
                      aria-label={`${cat.name_uz}: faollashtirish`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MappingRow({
  map,
  menuCategories,
  menuById,
  saving,
  onChange,
}: {
  map: CategoryMap
  menuCategories: CategoryMenuOption[]
  menuById: Map<string, CategoryMenuOption>
  saving: boolean
  onChange: (choice: string) => void
}) {
  const choice = categoryChoice(map)
  const mapped = map.menu_category_id ? menuById.get(map.menu_category_id) : undefined
  const label =
    choice === AUTO_CHOICE
      ? AUTO_LABEL
      : choice === IGNORE_CHOICE
        ? IGNORE_LABEL
        : (mapped?.name_uz ?? "O'chirilgan kategoriya")
  const path = formatGroupPath(map)

  return (
    <TableRow data-ignored={map.ignored || undefined} className="data-ignored:opacity-60">
      <TableCell className="align-middle">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="break-words">{path}</span>
          {map.auto && choice === AUTO_CHOICE && <Badge variant="outline">Avto</Badge>}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">{(map.product_count ?? 0).toLocaleString("ru-RU")}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Select value={choice} onValueChange={(v) => v && onChange(v)} disabled={saving}>
            <SelectTrigger className="w-full sm:w-64" aria-label={`${path}: menyu kategoriyasi`}>
              <SelectValue>{label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AUTO_CHOICE}>{AUTO_LABEL}</SelectItem>
              <SelectItem value={IGNORE_CHOICE}>{IGNORE_LABEL}</SelectItem>
              {menuCategories.length > 0 && <SelectSeparator />}
              {menuCategories.map((m) => (
                <SelectItem key={m._id} value={m._id}>
                  {m.name_uz}
                  {!m.is_active ? " (yashirin)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {saving && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-label="Saqlanmoqda" />}
        </div>
        {choice !== AUTO_CHOICE && choice !== IGNORE_CHOICE && !mapped && (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            Bog&apos;langan kategoriya topilmadi: keyingi sinxronlashda avtomatik qoidaga o&apos;tadi.
          </p>
        )}
      </TableCell>
    </TableRow>
  )
}
