"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle, XCircle, Trash2, MessageSquare, Star, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { approveReviewAction, rejectReviewAction, replyReviewAction, deleteReviewAction } from "@/lib/actions/reviews"
import { useDebounce } from "@/hooks/use-debounce"

const STATUS_LABELS: Record<string, string> = {
  all: "Barcha statuslar", pending: "Kutilmoqda", approved: "Tasdiqlangan", rejected: "Rad etilgan",
}
const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
}
const TARGET_LABELS: Record<string, string> = {
  all: "Barcha turlar", restaurant: "Restoran", product: "Mahsulot", courier: "Kuryer",
}

interface Props {
  initialData: { data: any[]; total: number; pages: number; page: number }
  initialFilters: { status: string; target_type: string; page: number; search: string }
}

export function ReviewsClient({ initialData, initialFilters }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState(initialFilters.status)
  const [targetType, setTargetType] = useState(initialFilters.target_type)
  const [search, setSearch] = useState(initialFilters.search)
  const debouncedSearch = useDebounce(search, 400)
  const [replyId, setReplyId] = useState("")
  const [replyText, setReplyText] = useState("")
  const [replyLoading, setReplyLoading] = useState(false)
  const [deleteId, setDeleteId] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)

  const navigate = (s: string, t: string, q: string, p = 1) => {
    const params = new URLSearchParams()
    if (s !== "all") params.set("status", s)
    if (t !== "all") params.set("target_type", t)
    if (q) params.set("search", q)
    if (p > 1) params.set("page", String(p))
    startTransition(() => router.push(`/reviews?${params}`))
  }

  useEffect(() => { navigate(status, targetType, debouncedSearch) }, [debouncedSearch])

  const handleApprove = async (id: string) => {
    const r = await approveReviewAction(id)
    r.success ? (toast.success("Tasdiqlandi"), startTransition(() => router.refresh()))
      : toast.error(r.error)
  }

  const handleReject = async (id: string) => {
    const r = await rejectReviewAction(id)
    r.success ? (toast.success("Rad etildi"), startTransition(() => router.refresh()))
      : toast.error(r.error)
  }

  const handleReply = async () => {
    if (!replyText.trim()) return
    setReplyLoading(true)
    const r = await replyReviewAction(replyId, replyText)
    setReplyLoading(false)
    if (r.success) {
      toast.success("Javob yuborildi")
      setReplyId(""); setReplyText("")
      startTransition(() => router.refresh())
    } else toast.error(r.error)
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
            placeholder="Foydalanuvchi nomi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-52"
          />
        </div>

        <Select value={status} onValueChange={(v) => { const val = v ?? "all"; setStatus(val); navigate(val, targetType, debouncedSearch) }}>
          <SelectTrigger className="w-48">
            <SelectValue>{STATUS_LABELS[status] ?? STATUS_LABELS.all}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={targetType} onValueChange={(v) => { const val = v ?? "all"; setTargetType(val); navigate(status, val, debouncedSearch) }}>
          <SelectTrigger className="w-44">
            <SelectValue>{TARGET_LABELS[targetType] ?? TARGET_LABELS.all}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TARGET_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>

        <span className="ml-auto text-sm text-muted-foreground">Jami: {initialData.total} ta</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="h-11 px-4 text-left font-medium">Foydalanuvchi</th>
              <th className="h-11 px-4 text-left font-medium">Tur / Maqsad</th>
              <th className="h-11 px-4 text-left font-medium">Izoh</th>
              <th className="h-11 px-4 text-left font-medium">Baho</th>
              <th className="h-11 px-4 text-left font-medium">Status</th>
              <th className="h-11 px-4 text-left font-medium">Sana</th>
              <th className="h-11 px-4 text-right font-medium">Amal</th>
            </tr>
          </thead>
          <tbody>
            {initialData.data.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Izohlar topilmadi</td></tr>
            )}
            {initialData.data.map((r: any) => (
              <tr key={r._id} className="border-b last:border-0 hover:bg-muted/20 align-top">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.user_id?.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.user_id?.phone}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-xs">{TARGET_LABELS[r.target_type] || r.target_type}</Badge>
                  <div className="text-xs text-muted-foreground mt-1">{r.target_id?.name || r.target_id?.name_uz || ""}</div>
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="text-sm line-clamp-2">{r.comment || <span className="text-muted-foreground italic">Izoh yo'q</span>}</p>
                  {r.restaurant_reply && (
                    <p className="text-xs text-blue-600 mt-1 line-clamp-1">↳ {r.restaurant_reply}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-medium">{r.rating}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={STATUS_STYLES[r.status] || ""}>
                    {STATUS_LABELS[r.status] || r.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString("uz")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1 flex-wrap">
                    {r.status === "pending" && (<>
                      <Button size="sm" variant="default" disabled={isPending} onClick={() => handleApprove(r._id)}>
                        <CheckCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleReject(r._id)}>
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </>)}
                    {r.status === "approved" && (
                      <Button size="sm" variant="outline" disabled={isPending}
                        onClick={() => { setReplyId(r._id); setReplyText(r.restaurant_reply || "") }}>
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600"
                      disabled={isPending} onClick={() => setDeleteId(r._id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{currentPage}-sahifa / {totalPages} ta</p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={currentPage <= 1 || isPending}
              onClick={() => navigate(status, targetType, debouncedSearch, currentPage - 1)}>
              <ChevronLeft className="h-4 w-4" /> Oldingi
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages || isPending}
              onClick={() => navigate(status, targetType, debouncedSearch, currentPage + 1)}>
              Keyingi <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Reply Dialog */}
      {replyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-lg ring-1 ring-foreground/10 space-y-4">
            <h3 className="font-medium">Izohga javob berish</h3>
            <Input
              placeholder="Javobingizni yozing..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setReplyId(""); setReplyText("") }}>Bekor qilish</Button>
              <Button disabled={replyLoading || !replyText.trim()} onClick={handleReply}>
                {replyLoading ? "Kutilmoqda..." : "Yuborish"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId("") }}
        title="Izohni o'chirish"
        description="Bu izoh o'chiriladi va reyting qayta hisoblanadi."
        confirmLabel="O'chirish"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={async () => {
          setDeleteLoading(true)
          const r = await deleteReviewAction(deleteId)
          setDeleteLoading(false)
          setDeleteId("")
          r.success ? (toast.success("O'chirildi"), startTransition(() => router.refresh()))
            : toast.error(r.error)
        }}
      />
    </div>
  )
}
