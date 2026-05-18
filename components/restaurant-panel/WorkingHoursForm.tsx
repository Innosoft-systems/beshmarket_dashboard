"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { saveMyWorkingHoursAction } from "@/lib/actions/restaurant-panel"
import type { WorkingHours } from "@/types"

const DAYS = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"]
const WEEKDAYS = [0, 1, 2, 3, 4] // Mon–Fri indices
const WEEKEND = [5, 6]            // Sat–Sun indices

type Row = Pick<WorkingHours, "day_of_week" | "open_time" | "close_time" | "is_closed">

export function WorkingHoursForm({ hours }: { hours: WorkingHours[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rows, setRows] = useState<Row[]>(() =>
    DAYS.map((_, index) => {
      const existing = hours.find((h) => Number(h.day_of_week) === index + 1)
      return {
        day_of_week: index + 1,
        open_time: existing?.open_time || "09:00",
        close_time: existing?.close_time || "22:00",
        is_closed: existing?.is_closed || false,
      }
    }),
  )

  const update = (index: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((row, i) => i === index ? { ...row, ...patch } : row))
  }

  const applyToAll = (source: Row) => {
    setRows((prev) =>
      prev.map((row) => ({ ...row, open_time: source.open_time, close_time: source.close_time, is_closed: source.is_closed })),
    )
    toast.success("Barcha kunlarga qo'llanildi")
  }

  const applyToWeekdays = (source: Row) => {
    setRows((prev) =>
      prev.map((row, i) => WEEKDAYS.includes(i) ? { ...row, open_time: source.open_time, close_time: source.close_time, is_closed: source.is_closed } : row),
    )
    toast.success("Ish kunlariga qo'llanildi")
  }

  const applyToWeekend = (source: Row) => {
    setRows((prev) =>
      prev.map((row, i) => WEEKEND.includes(i) ? { ...row, open_time: source.open_time, close_time: source.close_time, is_closed: source.is_closed } : row),
    )
    toast.success("Dam olish kunlariga qo'llanildi")
  }

  const validate = (): boolean => {
    for (const row of rows) {
      if (row.is_closed) continue
      if (row.open_time >= row.close_time) {
        toast.error(`${DAYS[row.day_of_week - 1]}: yopilish vaqti ochilishdan keyin bo'lishi kerak`)
        return false
      }
    }
    return true
  }

  const save = async () => {
    if (!validate()) return
    const result = await saveMyWorkingHoursAction(rows)
    if (result.success) {
      toast.success("Ish vaqti saqlandi")
      startTransition(() => router.refresh())
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-background">
        <div className="divide-y">
          {rows.map((row, index) => (
            <div key={row.day_of_week} className="grid gap-3 p-4 md:grid-cols-[1fr_150px_150px_auto_auto] md:items-center">
              <div className="font-medium text-sm">{DAYS[index]}</div>
              <Input
                type="time"
                value={row.open_time}
                disabled={row.is_closed}
                aria-label={`${DAYS[index]} ochilish vaqti`}
                onChange={(e) => update(index, { open_time: e.target.value })}
              />
              <Input
                type="time"
                value={row.close_time}
                disabled={row.is_closed}
                aria-label={`${DAYS[index]} yopilish vaqti`}
                onChange={(e) => update(index, { close_time: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <Switch
                  id={`closed-${index}`}
                  checked={row.is_closed}
                  onCheckedChange={(checked) => update(index, { is_closed: checked })}
                />
                <Label htmlFor={`closed-${index}`} className="text-sm cursor-pointer">Yopiq</Label>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-muted-foreground h-8 px-2"
                  title="Barcha kunlarga qo'llash"
                  onClick={() => applyToAll(row)}
                >
                  Hammasiga
                </Button>
                {WEEKDAYS.includes(index) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-muted-foreground h-8 px-2"
                    title="Ish kunlariga qo'llash"
                    onClick={() => applyToWeekdays(row)}
                  >
                    Ish kunlari
                  </Button>
                )}
                {WEEKEND.includes(index) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-muted-foreground h-8 px-2"
                    title="Dam olish kunlariga qo'llash"
                    onClick={() => applyToWeekend(row)}
                  >
                    Dam olish
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t p-4 flex items-center gap-3">
          <Button onClick={save} disabled={isPending}>Saqlash</Button>
          <p className="text-xs text-muted-foreground">Vaqtni o'zgartirish va "Hammasiga" tugmasi boshqa kunlarga ham nusxalaydi</p>
        </div>
      </div>
    </div>
  )
}
