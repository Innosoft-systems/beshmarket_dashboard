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

  const res = await apiRequest<any>(`/shifts/penalties?${qs}`, { accessToken: token }).catch(
    () => ({ data: { data: [], total: 0, pages: 1 } }),
  )

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
        {[
          { label: "Kutilmoqda", filterStatus: "pending", color: "border-amber-500 text-amber-600" },
          { label: "Yechildi", filterStatus: "deducted", color: "border-red-500 text-red-600" },
          { label: "Bekor qilindi", filterStatus: "waived", color: "border-green-500 text-green-600" },
        ].map(({ label, filterStatus, color }) => {
          const count = res.data?.data?.filter((p: any) => p.status === filterStatus).length ?? 0
          return (
            <div key={filterStatus} className={`rounded-xl border ${color} bg-background p-4 space-y-1`}>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          )
        })}
      </div>

      <PenaltiesClient
        initialData={res.data}
        initialFilters={{ status, reason, page, search }}
      />
    </div>
  )
}
