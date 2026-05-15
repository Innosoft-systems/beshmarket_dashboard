import { Metadata } from "next"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { ShiftsClient } from "@/components/shifts/ShiftsClient"

export const metadata: Metadata = { title: "Smenalar | BeshMarket" }

interface Props {
  searchParams: Promise<{ date?: string; zone_name?: string; page?: string }>
}

export default async function ShiftsPage({ searchParams }: Props) {
  const sp = await searchParams
  const date = sp.date || ""
  const zone_name = sp.zone_name || ""
  const page = sp.page ? +sp.page : 1

  const token = await getAccessToken()
  const qs = new URLSearchParams({ page: String(page), limit: "20" })
  if (date) qs.set("date", date)
  if (zone_name) qs.set("zone_name", zone_name)

  const [slotsRes, statsRes] = await Promise.all([
    apiRequest<any>(`/shifts/admin/slots?${qs}`, { accessToken: token }).catch(
      () => ({ data: { data: [], total: 0, pages: 1 } }),
    ),
    apiRequest<any>(`/shifts/admin/stats`, { accessToken: token }).catch(
      () => ({ data: { total: 0, active: 0, booked: 0 } }),
    ),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Smenalar</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Kuryer smena slotlarini boshqarish — zona, vaqt va to'lovni belgilash
        </p>
      </div>

      <ShiftsClient
        initialData={slotsRes.data}
        initialFilters={{ date, zone_name, page }}
        stats={statsRes.data}
      />
    </div>
  )
}
