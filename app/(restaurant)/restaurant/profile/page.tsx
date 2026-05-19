import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"
import { RestaurantProfileForm } from "@/components/restaurant-panel/RestaurantProfileForm"

export default async function RestaurantProfilePage() {
  const token = await getAccessToken()

  let restaurant: any = null
  try {
    const { data } = await apiRequest<any>("/restaurants/my", {
      accessToken: token,
    })
    restaurant = data
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 429) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
          <p className="text-lg font-medium">Juda ko'p so'rov</p>
          <p className="text-sm text-muted-foreground">Iltimos, bir necha soniya kutib qayta urinib ko'ring.</p>
        </div>
      )
    }
    throw err
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
        <p className="text-sm text-muted-foreground">Restoran ma'lumotlarini yangilash</p>
      </div>
      <RestaurantProfileForm restaurant={restaurant} />
    </div>
  )
}
