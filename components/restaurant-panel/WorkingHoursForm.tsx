"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarClock, Check, Clock3, Copy, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { saveMyWorkingHoursAction } from "@/lib/actions/restaurant-panel"
import type { WorkingHours } from "@/types"

const DAYS = [
  { value: 1, label: "Dushanba", short: "Du" },
  { value: 2, label: "Seshanba", short: "Se" },
  { value: 3, label: "Chorshanba", short: "Ch" },
  { value: 4, label: "Payshanba", short: "Pa" },
  { value: 5, label: "Juma", short: "Ju" },
  { value: 6, label: "Shanba", short: "Sh" },
  { value: 0, label: "Yakshanba", short: "Ya" },
] as const

const WEEKDAYS = new Set([1, 2, 3, 4, 5])
const WEEKEND = new Set([0, 6])

type Row = Pick<WorkingHours, "day_of_week" | "open_time" | "close_time" | "is_closed">

export function WorkingHoursForm({ hours }: { hours: WorkingHours[] }) {
  const router = useRouter()
  const [isRefreshing, startTransition] = useTransition()
  const [isSaving, setIsSaving] = useState(false)
  const [rows, setRows] = useState<Row[]>(() =>
    DAYS.map((day) => {
      const existing = hours.find((item) => Number(item.day_of_week) === day.value)
      return {
        day_of_week: day.value,
        open_time: existing?.open_time || "09:00",
        close_time: existing?.close_time || "22:00",
        is_closed: existing?.is_closed ?? false,
      }
    }),
  )

  const update = (day: number, patch: Partial<Row>) => {
    setRows((current) =>
      current.map((row) => (row.day_of_week === day ? { ...row, ...patch } : row)),
    )
  }

  const copySchedule = (source: Row, target: "all" | "weekdays" | "weekend") => {
    setRows((current) =>
      current.map((row) => {
        const shouldCopy =
          target === "all" ||
          (target === "weekdays" && WEEKDAYS.has(row.day_of_week)) ||
          (target === "weekend" && WEEKEND.has(row.day_of_week))

        return shouldCopy
          ? {
              ...row,
              open_time: source.open_time,
              close_time: source.close_time,
              is_closed: source.is_closed,
            }
          : row
      }),
    )

    const message =
      target === "all"
        ? "Jadval barcha kunlarga qo'llandi"
        : target === "weekdays"
          ? "Jadval ish kunlariga qo'llandi"
          : "Jadval dam olish kunlariga qo'llandi"
    toast.success(message)
  }

  const save = async () => {
    const invalid = rows.find(
      (row) => !row.is_closed && (!row.open_time || !row.close_time || row.open_time === row.close_time),
    )
    if (invalid) {
      const day = DAYS.find((item) => item.value === invalid.day_of_week)
      toast.error(`${day?.label}: ochilish va yopilish vaqtini tekshiring`)
      return
    }

    setIsSaving(true)
    const result = await saveMyWorkingHoursAction(rows)
    setIsSaving(false)

    if (result.success) {
      toast.success("Ish vaqti saqlandi")
      startTransition(() => router.refresh())
    } else {
      toast.error(result.error)
    }
  }

  const activeDays = rows.filter((row) => !row.is_closed).length

  return (
    <section className="overflow-hidden rounded-xl border bg-background shadow-sm">
      <div className="flex flex-col gap-4 border-b bg-muted/25 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background text-primary shadow-sm">
            <CalendarClock className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold tracking-tight">Ish vaqti</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Buyurtma qabul qiladigan kun va vaqtlarni belgilang
            </p>
          </div>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground">
          <span className="size-2 rounded-full bg-emerald-500" />
          Haftada {activeDays} kun ishlaydi
        </div>
      </div>

      <div className="hidden grid-cols-[minmax(140px,1fr)_145px_24px_145px_150px_120px] items-center gap-3 border-b px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
        <span>Hafta kuni</span>
        <span>Ochilish</span>
        <span />
        <span>Yopilish</span>
        <span>Holati</span>
        <span />
      </div>

      <div className="divide-y">
        {rows.map((row) => {
          const day = DAYS.find((item) => item.value === row.day_of_week)!
          const isOvernight = !row.is_closed && row.close_time < row.open_time

          return (
            <div
              key={row.day_of_week}
              className={`grid gap-4 px-4 py-4 transition-colors sm:px-5 md:grid-cols-[minmax(140px,1fr)_145px_24px_145px_150px_120px] md:items-center md:gap-3 ${
                row.is_closed ? "bg-muted/20" : "hover:bg-muted/15"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                    row.is_closed
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {day.short}
                </span>
                <div>
                  <p className={`text-sm font-medium ${row.is_closed ? "text-muted-foreground" : ""}`}>
                    {day.label}
                  </p>
                  {isOvernight && (
                    <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">
                      Keyingi kuni yopiladi
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`open-${row.day_of_week}`} className="text-xs text-muted-foreground md:sr-only">
                  Ochilish vaqti
                </Label>
                <Input
                  id={`open-${row.day_of_week}`}
                  type="time"
                  value={row.open_time}
                  disabled={row.is_closed}
                  className="font-medium tabular-nums"
                  onChange={(event) => update(row.day_of_week, { open_time: event.target.value })}
                />
              </div>

              <Clock3 className="mx-auto hidden size-4 text-muted-foreground/60 md:block" />

              <div className="space-y-1.5">
                <Label htmlFor={`close-${row.day_of_week}`} className="text-xs text-muted-foreground md:sr-only">
                  Yopilish vaqti
                </Label>
                <Input
                  id={`close-${row.day_of_week}`}
                  type="time"
                  value={row.close_time}
                  disabled={row.is_closed}
                  className="font-medium tabular-nums"
                  onChange={(event) => update(row.day_of_week, { close_time: event.target.value })}
                />
              </div>

              <div className="flex items-center gap-2.5">
                <Switch
                  id={`working-${row.day_of_week}`}
                  checked={!row.is_closed}
                  onCheckedChange={(checked) => update(row.day_of_week, { is_closed: !checked })}
                />
                <Label htmlFor={`working-${row.day_of_week}`} className="cursor-pointer text-sm">
                  {row.is_closed ? "Dam olish" : "Ishlaydi"}
                </Label>
              </div>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="justify-start text-xs text-muted-foreground md:justify-center"
                onClick={() => copySchedule(row, "all")}
              >
                <Copy />
                Hammasiga
              </Button>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 border-t bg-muted/20 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => copySchedule(rows[0], "weekdays")}>
            <Copy />
            Dushanbani ish kunlariga
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => copySchedule(rows[5], "weekend")}>
            <Copy />
            Shanbani dam olish kunlariga
          </Button>
        </div>
        <Button type="button" onClick={save} disabled={isSaving || isRefreshing} className="sm:min-w-36">
          {isSaving || isRefreshing ? <Loader2 className="animate-spin" /> : <Check />}
          {isSaving ? "Saqlanmoqda..." : "Jadvalni saqlash"}
        </Button>
      </div>
    </section>
  )
}
