"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { saveMyWorkingHoursAction } from "@/lib/actions/restaurant-panel"

const days = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"]

export function WorkingHoursForm({ hours }: { hours: any[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rows, setRows] = useState(() =>
    days.map((_, index) => {
      const existing = hours.find((h) => Number(h.day_of_week) === index + 1)
      return {
        day_of_week: index + 1,
        open_time: existing?.open_time || "09:00",
        close_time: existing?.close_time || "22:00",
        is_closed: existing?.is_closed || false,
      }
    }),
  )

  const update = (index: number, patch: any) => {
    setRows((prev) => prev.map((row, i) => i === index ? { ...row, ...patch } : row))
  }

  const save = async () => {
    const result = await saveMyWorkingHoursAction(rows)
    if (result.success) {
      toast.success("Ish vaqti saqlandi")
      startTransition(() => router.refresh())
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="rounded-lg border bg-background">
      <div className="divide-y">
        {rows.map((row, index) => (
          <div key={row.day_of_week} className="grid gap-3 p-4 md:grid-cols-[1fr_150px_150px_120px] md:items-center">
            <div className="font-medium">{days[index]}</div>
            <Input
              type="time"
              value={row.open_time}
              disabled={row.is_closed}
              onChange={(e) => update(index, { open_time: e.target.value })}
            />
            <Input
              type="time"
              value={row.close_time}
              disabled={row.is_closed}
              onChange={(e) => update(index, { close_time: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={row.is_closed}
                onChange={(e) => update(index, { is_closed: e.target.checked })}
              />
              Yopiq
            </label>
          </div>
        ))}
      </div>
      <div className="border-t p-4">
        <Button onClick={save} disabled={isPending}>Saqlash</Button>
      </div>
    </div>
  )
}
