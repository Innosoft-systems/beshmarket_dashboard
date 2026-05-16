import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { PromotionsClient } from "@/components/restaurant-panel/PromotionsClient"

export default async function RestaurantPromotionsPage() {
  const token = await getAccessToken()
  const { data } = await apiRequest<any[]>("/promotions/my?limit=100", { accessToken: token })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Promo kodlar</h1>
        <p className="text-sm text-muted-foreground">Restoran uchun aksiyalarni boshqarish</p>
      </div>
      <PromotionsClient promotions={Array.isArray(data) ? data : []} />
    </div>
  )
}
