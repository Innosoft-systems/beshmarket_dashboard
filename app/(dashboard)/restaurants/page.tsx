import { Metadata } from "next"
import { getRestaurants } from "@/lib/api/restaurants"
import { RestaurantsTableClient } from "@/components/restaurants/RestaurantsTableClient"
import { getAccessToken } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Restoranlar | BeshMarket",
}

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const accessToken = await getAccessToken()
  
  const params = await searchParams;
  const page = Number(params.page) || 1
  
  try {
    const { data: response } = await getRestaurants({ page, limit: 10 }, accessToken)
    
    return (
      <RestaurantsTableClient 
        initialData={response.data} 
        totalPages={response.pagination.totalPages} 
        currentPage={response.pagination.page} 
      />
    )
  } catch (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Restoranlarni yuklashda xatolik yuz berdi.
      </div>
    )
  }
}
