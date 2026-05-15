import { Metadata } from "next"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { ReviewsClient } from "@/components/reviews/ReviewsClient"

export const metadata: Metadata = { title: "Izohlar | BeshMarket" }

interface Props {
  searchParams: Promise<{ status?: string; target_type?: string; page?: string; search?: string }>
}

export default async function ReviewsPage({ searchParams }: Props) {
  const sp = await searchParams
  const status = sp.status || "all"
  const target_type = sp.target_type || "all"
  const page = sp.page ? +sp.page : 1
  const search = sp.search || ""

  const token = await getAccessToken()
  const qs = new URLSearchParams({ page: String(page), limit: "20" })
  if (status !== "all") qs.set("status", status)
  if (target_type !== "all") qs.set("target_type", target_type)
  if (search) qs.set("search", search)

  const [res, statsRes] = await Promise.all([
    apiRequest<any>(`/reviews?${qs}`, { accessToken: token }).catch(
      () => ({ data: { data: [], total: 0, pages: 1 } }),
    ),
    apiRequest<any>(`/reviews/stats`, { accessToken: token }).catch(
      () => ({ data: { pending: 0, approved: 0, rejected: 0 } }),
    ),
  ])

  const stats = statsRes.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Izohlar</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Restoran, mahsulot va kuryer izohlarini moderatsiya qilish
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-amber-500 bg-background p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Kutilmoqda</p>
          <p className="text-2xl font-bold">{stats.pending ?? 0}</p>
        </div>
        <div className="rounded-xl border border-green-500 bg-background p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Tasdiqlangan</p>
          <p className="text-2xl font-bold">{stats.approved ?? 0}</p>
        </div>
        <div className="rounded-xl border border-red-500 bg-background p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Rad etilgan</p>
          <p className="text-2xl font-bold">{stats.rejected ?? 0}</p>
        </div>
      </div>

      <ReviewsClient
        initialData={res.data}
        initialFilters={{ status, target_type, page, search }}
      />
    </div>
  )
}
