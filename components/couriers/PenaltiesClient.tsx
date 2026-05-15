"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle, XCircle, AlertTriangle, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { approvePenaltyAction, waivePenaltyAction } from "@/lib/actions/penalties"
import { useDebounce } from "@/hooks/use-debounce"

const REASON_LABELS: Record<string, string> = {
  all: "Barcha sabablar",
  cancellation: "Smena bekor qilish",
  no_show: "Smenaga kelmagan",
  order_reject: "Buyurtma rad etish",
}

const STATUS_LABELS: Record<string, string> = {
  all: "Barcha statuslar",
  pending: "Kutilmoqda",
  deducted: "Yechildi",
  waived: "Bekor qilindi",
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  deducted: "bg-red-100 text-red-700 border-red-200",
  waived: "bg-green-100 text-green-700 border-green-200",
}

interface Props {
  initialData: { data: any[]; total: number; pages: number; page: number }
  initialFilters: { status: string; reason: string; page: number; search: string }
}

export function PenaltiesClient({ initialData, initialFilters }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState(initialFilters.status)
  const [reason, setReason] = useState(initialFilters.reason)
  const [search, setSearch] = useState(initialFilters.search)
  const debouncedSearch = useDebounce(search, 400)
  const [confirmId, setConfirmId] = useState("")
  const [confirmAction, setConfirmAction] = useState<"approve" | "waive" | "">("")
  const [confirmLoading, setConfirmLoading] = useState(false)

  const navigate = (newStatus: string, newReason: string, newSearch: string, newPage = 1) => {
    const params = new URLSearchParams()
    if (newStatus !== "all") params.set("status", newStatus)
    if (newReason !== "all") params.set("reason", newReason)
    if (newSearch) params.set("search", newSearch)
    if (newPage > 1) params.set("page", String(newPage))
    startTransition(() => router.push(`/penalties?${params}`))
  }

  useEffect(() => {
    navigate(status, reason, debouncedSearch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const handleConfirm = async () => {
    if (!confirmId || !confirmAction) return
    setConfirmLoading(true)
    const result = confirmAction === "approve"
      ? await approvePenaltyAction(confirmId)
      : await waivePenaltyAction(confirmId)
    setConfirmLoading(false)
    setConfirmId("")
    setConfirmAction("")
    if (result.success) {
      toast.success(confirmAction === "approve" ? "Jarima tasdiqlandi" : "Jarima bekor qilindi")
      startTransition(() => router.refresh())
    } else {
      toast.error(result.error || "Xatolik")
    }
  }

  const currentPage = initialFilters.page
  const totalPages = initialData.pages

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ism yoki telefon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-56"
          />
        </div>

        <Select
          value={status}
          onValueChange={(v) => {
            const val = v ?? "all"
            setStatus(val)
            navigate(val, reason, debouncedSearch)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue>{STATUS_LABELS[status] ?? STATUS_LABELS.all}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha statuslar</SelectItem>
            <SelectItem value="pending">Kutilmoqda</SelectItem>
            <SelectItem value="deducted">Yechildi</SelectItem>
            <SelectItem value="waived">Bekor qilindi</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={reason}
          onValueChange={(v) => {
            const val = v ?? "all"
            setReason(val)
            navigate(status, val, debouncedSearch)
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue>{REASON_LABELS[reason] ?? REASON_LABELS.all}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha sabablar</SelectItem>
            <SelectItem value="cancellation">Smena bekor qilish</SelectItem>
            <SelectItem value="no_show">Smenaga kelmagan</SelectItem>
            <SelectItem value="order_reject">Buyurtma rad etish</SelectItem>
          </SelectContent>
        </Select>

        <span className="ml-auto text-sm text-muted-foreground">
          Jami: {initialData.total} ta
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="h-11 px-4 text-left font-medium">Kuryer</th>
              <th className="h-11 px-4 text-left font-medium">Sabab</th>
              <th className="h-11 px-4 text-left font-medium">Smena / Buyurtma</th>
              <th className="h-11 px-4 text-right font-medium">Miqdor</th>
              <th className="h-11 px-4 text-left font-medium">Status</th>
              <th className="h-11 px-4 text-left font-medium">Sana</th>
              <th className="h-11 px-4 text-right font-medium">Amal</th>
            </tr>
          </thead>
          <tbody>
            {initialData.data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  Jarimalar topilmadi
                </td>
              </tr>
            )}
            {initialData.data.map((p: any) => (
              <tr key={p._id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="font-medium">{p.courier_id?.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{p.courier_id?.phone}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {REASON_LABELS[p.reason] || p.reason}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {p.slot_id
                    ? `${p.slot_id.date} ${p.slot_id.start_time}–${p.slot_id.end_time} · ${p.slot_id.zone_name}`
                    : p.order_id
                    ? `Buyurtma ${p.order_id.order_number}`
                    : p.slot_date
                    ? `${p.slot_date} ${p.slot_start_time}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-red-600">
                  {p.amount?.toLocaleString()} so'm
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={STATUS_STYLES[p.status] || ""}>
                    {STATUS_LABELS[p.status] || p.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Date(p.createdAt).toLocaleDateString("uz")}
                </td>
                <td className="px-4 py-3 text-right">
                  {p.status === "pending" && (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => { setConfirmId(p._id as string); setConfirmAction("approve") }}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Tasdiqlash
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => { setConfirmId(p._id as string); setConfirmAction("waive") }}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Bekor qilish
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {currentPage}-sahifa / {totalPages} ta
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isPending}
              onClick={() => navigate(status, reason, debouncedSearch, currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Oldingi
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || isPending}
              onClick={() => navigate(status, reason, debouncedSearch, currentPage + 1)}
            >
              Keyingi
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(open) => { if (!open) { setConfirmId(""); setConfirmAction("") } }}
        title={confirmAction === "approve" ? "Jarimani tasdiqlash" : "Jarimani bekor qilish"}
        description={
          confirmAction === "approve"
            ? "Jarima tasdiqlanadi va kuryerning balansidan yechiladi. Davom etasizmi?"
            : "Jarima bekor qilinadi va kuryerning balansiga ta'sir qilmaydi."
        }
        confirmLabel={confirmAction === "approve" ? "Tasdiqlash" : "Bekor qilish"}
        variant={confirmAction === "approve" ? "destructive" : "default"}
        loading={confirmLoading}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
