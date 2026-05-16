import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { RestaurantProfileForm } from "@/components/restaurant-panel/RestaurantProfileForm"

export default async function RestaurantProfilePage() {
  const token = await getAccessToken()
  const { data: restaurant } = await apiRequest<any>("/restaurants/my", { accessToken: token })

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
