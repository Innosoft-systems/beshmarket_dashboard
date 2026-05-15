import { Metadata } from "next"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { PenaltiesClient } from "@/components/couriers/PenaltiesClient"

export const metadata: Metadata = { title: "Jarimalar | BeshMarket" }

interface Props {
  searchParams: Promise<{ status?: string; reason?: string; page?: string; search?: string }>
}

export default async function PenaltiesPage({ searchParams }: Props) {
  const sp = await searchParams
  const status = sp.status || "all"
  const reason = sp.reason || "all"
  const page = sp.page ? +sp.page : 1
  const search = sp.search || ""

  const token = await getAccessToken()
  const qs = new URLSearchParams({ page: String(page), limit: "20" })
  if (status !== "all") qs.set("status", status)
  if (reason !== "all") qs.set("reason", reason)
  if (search) qs.set("search", search)

  const [res, statsRes] = await Promise.all([
    apiRequest<any>(`/shifts/penalties?${qs}`, { accessToken: token }).catch(
      () => ({ data: { data: [], total: 0, pages: 1 } }),
    ),
    apiRequest<any>(`/shifts/penalties/stats`, { accessToken: token }).catch(
      () => ({ data: { pending: { count: 0, total: 0 }, deducted: { count: 0, total: 0 }, waived: { count: 0, total: 0 } } }),
    ),
  ])

  const stats = statsRes.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Jarimalar</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Smena bekor qilish, smenaga kelmagan va buyurtma rad etish jarimalar
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-amber-500 bg-background p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Kutilmoqda</p>
          <p className="text-2xl font-bold">{stats.pending?.count ?? 0}</p>
          <p className="text-xs text-muted-foreground">{(stats.pending?.total ?? 0).toLocaleString()} so'm</p>
        </div>
        <div className="rounded-xl border border-red-500 bg-background p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Yechildi</p>
          <p className="text-2xl font-bold">{stats.deducted?.count ?? 0}</p>
          <p className="text-xs text-muted-foreground">{(stats.deducted?.total ?? 0).toLocaleString()} so'm</p>
        </div>
        <div className="rounded-xl border border-green-500 bg-background p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Bekor qilindi</p>
          <p className="text-2xl font-bold">{stats.waived?.count ?? 0}</p>
          <p className="text-xs text-muted-foreground">{(stats.waived?.total ?? 0).toLocaleString()} so'm</p>
        </div>
      </div>

      <PenaltiesClient
        initialData={res.data}
        initialFilters={{ status, reason, page, search }}
      />
    </div>
  )
}
