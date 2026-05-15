import { Metadata } from "next"
import { getRestaurants } from "@/lib/api/restaurants"
import { RestaurantsTableClient } from "@/components/restaurants/RestaurantsTableClient"
import { getAccessToken } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Restoranlar | BeshMarket",
}

interface Props {
  searchParams: Promise<{ page?: string; search?: string; is_active?: string }>
}

export default async function RestaurantsPage({ searchParams }: Props) {
  const accessToken = await getAccessToken()
  const params = await searchParams

  const page = Number(params.page) || 1
  const search = params.search || ""
  const is_active = params.is_active || ""

  try {
    const { data: response } = await getRestaurants(
      {
        page,
        limit: 10,
        ...(search && { search }),
        ...(is_active && { is_active: is_active === "true" }),
      },
      accessToken,
    )

    return (
      <RestaurantsTableClient
        initialData={response?.data ?? []}
        totalPages={response?.pagination?.totalPages ?? 1}
        currentPage={response?.pagination?.page ?? page}
        filters={{ search, is_active }}
      />
    )
  } catch {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Restoranlarni yuklashda xatolik yuz berdi.
      </div>
    )
  }
}
