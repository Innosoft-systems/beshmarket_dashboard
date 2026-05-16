import { Metadata } from "next"
import { CouriersClient } from "@/components/couriers/CouriersClient"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"

export const metadata: Metadata = { title: "Kuryerlar | BeshMarket" }

interface Props {
  searchParams: Promise<{ page?: string; search?: string; status?: string; is_active?: string }>
}

export default async function CouriersPage({ searchParams }: Props) {
  const accessToken = await getAccessToken()
  const sp = await searchParams
  const page = sp.page ? +sp.page : 1
  const search = sp.search || ""
  const status = sp.status || ""
  const is_active = sp.is_active || ""

  const qs = new URLSearchParams({ page: String(page), limit: "20" })
  if (search) qs.set("search", search)
  if (status) qs.set("status", status)
  if (is_active) qs.set("is_active", is_active)

  try {
    const { data } = await apiRequest<any>(`/couriers?${qs}`, { accessToken: accessToken || undefined })
    return (
      <CouriersClient
        couriers={data?.data ?? []}
        totalPages={data?.pages ?? 1}
        currentPage={page}
        filters={{ search, status, is_active }}
        accessToken={accessToken || ""}
      />
    )
  } catch {
    return <div className="p-4 rounded-md bg-red-50 text-red-500">Kuryerlarni yuklashda xatolik yuz berdi.</div>
  }
}
