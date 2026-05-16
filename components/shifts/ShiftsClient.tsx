"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Users, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { SlotFormDialog } from "./SlotFormDialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { deleteSlotAction } from "@/lib/actions/shifts"

const DAY_NAMES = ["Yak", "Du", "Se", "Cho", "Pay", "Ju", "Sha"]
const DAY_NAMES_FULL = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"]

function getWeekDays() {
  const today = new Date()
  // Haftaning dushanbasi
  const monday = new Date(today)
  const day = today.getDay() === 0 ? 6 : today.getDay() - 1
  monday.setDate(today.getDate() - day)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return {
      date: d.toISOString().split("T")[0],
      label: DAY_NAMES[(d.getDay())],
      fullLabel: DAY_NAMES_FULL[d.getDay()],
      dayNum: d.getDate(),
      isToday: d.toISOString().split("T")[0] === today.toISOString().split("T")[0],
    }
  })
}

interface Props {
  initialData: { data: any[]; total: number; pages: number; page: number }
  initialFilters: { date: string; zone_name: string; page: number }
  stats: { total: number; active: number; booked: number }
}

export function ShiftsClient({ initialData, initialFilters, stats }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState(initialFilters.date)
  const [zoneName, setZoneName] = useState(initialFilters.zone_name)
  const [formOpen, setFormOpen] = useState(false)
  const [editSlot, setEditSlot] = useState<any>(null)
  const [deleteId, setDeleteId] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)

  const weekDays = getWeekDays()

  const navigate = (d: string, z: string, p = 1) => {
    const params = new URLSearchParams()
    if (d) params.set("date", d)
    if (z) params.set("zone_name", z)
    if (p > 1) params.set("page", String(p))
    startTransition(() => router.push(`/shifts?${params}`))
  }

  const currentPage = initialFilters.page
  const totalPages = initialData.pages

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-blue-500 bg-background p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Kelgusi slotlar</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-green-500 bg-background p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Faol</p>
          <p className="text-2xl font-bold">{stats.active}</p>
        </div>
        <div className="rounded-xl border border-amber-500 bg-background p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Bandlangan</p>
          <p className="text-2xl font-bold">{stats.booked}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <Select
          value={date || "all"}
          onValueChange={(v) => {
            const val = !v || v === "all" ? "" : v
            setDate(val)
            navigate(val, zoneName)
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue>
              {date
                ? (() => {
                    const d = weekDays.find(w => w.date === date)
                    return d ? `${d.fullLabel} — ${d.date}` : date
                  })()
                : "Barcha kunlar"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha kunlar</SelectItem>
            {weekDays.map((d) => (
              <SelectItem key={d.date} value={d.date}>
                {d.fullLabel} — {d.date}{d.isToday ? " (Bugun)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Zona nomi..."
          value={zoneName}
          onChange={(e) => setZoneName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && navigate(date, zoneName)}
          className="w-44"
        />
        <Button variant="outline" onClick={() => navigate(date, zoneName)}>Qidirish</Button>
        {(date || zoneName) && (
          <Button variant="outline" onClick={() => { setDate(""); setZoneName(""); navigate("", "") }}>
            Tozalash
          </Button>
        )}
        <Button className="ml-auto" onClick={() => { setEditSlot(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" /> Slot qo'shish
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="h-11 px-4 text-left font-medium">Sana</th>
              <th className="h-11 px-4 text-left font-medium">Vaqt</th>
              <th className="h-11 px-4 text-left font-medium">Zona</th>
              <th className="h-11 px-4 text-right font-medium">To'lov</th>
              <th className="h-11 px-4 text-right font-medium">Bonus</th>
              <th className="h-11 px-4 text-center font-medium">Bandlik</th>
              <th className="h-11 px-4 text-left font-medium">Status</th>
              <th className="h-11 px-4 text-right font-medium">Amal</th>
            </tr>
          </thead>
          <tbody>
            {initialData.data.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Slotlar topilmadi</td></tr>
            )}
            {initialData.data.map((slot: any) => {
              const slotDay = weekDays.find(d => d.date === slot.date)
              return (
                <tr key={slot._id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">
                    <div>{slot.date}</div>
                    {slotDay && <div className="text-xs text-muted-foreground">{slotDay.fullLabel}</div>}
                  </td>
                  <td className="px-4 py-3">{slot.start_time} – {slot.end_time}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      <span>{slot.zone_name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {slot.zone_coordinates?.lat?.toFixed(4)}, {slot.zone_coordinates?.lng?.toFixed(4)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{slot.payout?.toLocaleString()} so'm</td>
                  <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                    {slot.bonus_per_order ? `+${slot.bonus_per_order?.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{slot.booked_by?.length ?? 0} / {slot.max_couriers}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={slot.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-600"}>
                      {slot.is_active ? "Faol" : "Nofaol"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" disabled={isPending}
                        onClick={() => { setEditSlot(slot); setFormOpen(true) }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600"
                        disabled={isPending || (slot.booked_by?.length ?? 0) > 0}
                        onClick={() => setDeleteId(slot._id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{currentPage}-sahifa / {totalPages} ta</p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={currentPage <= 1 || isPending}
              onClick={() => navigate(date, zoneName, currentPage - 1)}>
              <ChevronLeft className="h-4 w-4" /> Oldingi
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages || isPending}
              onClick={() => navigate(date, zoneName, currentPage + 1)}>
              Keyingi <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {formOpen && (
        <SlotFormDialog slot={editSlot} onClose={() => { setFormOpen(false); setEditSlot(null) }} />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId("") }}
        title="Slotni o'chirish"
        description="Bu slot o'chiriladi. Bandlangan slotni o'chirib bo'lmaydi."
        confirmLabel="O'chirish"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={async () => {
          setDeleteLoading(true)
          const r = await deleteSlotAction(deleteId)
          setDeleteLoading(false)
          setDeleteId("")
          r.success ? (toast.success("O'chirildi"), startTransition(() => router.refresh()))
            : toast.error(r.error)
        }}
      />
    </div>
  )
}
