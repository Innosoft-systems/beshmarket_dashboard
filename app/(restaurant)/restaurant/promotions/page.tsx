import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"
import { PromotionsClient } from "@/components/restaurant-panel/PromotionsClient"

export default async function RestaurantPromotionsPage() {
  const token = await getAccessToken()

  let promotions: any[] = []
  try {
    const { data } = await apiRequest<any>("/promotions/my?limit=100", { accessToken: token })
    promotions = Array.isArray(data) ? data : (data?.data ?? [])
  } catch (err) {
    if (!(err instanceof ApiError && (err.statusCode === 404 || err.statusCode === 403))) {
      throw err
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Promo kodlar</h1>
        <p className="text-sm text-muted-foreground">Restoran uchun aksiyalarni boshqarish</p>
      </div>
      <PromotionsClient promotions={promotions} />
    </div>
  )
}
