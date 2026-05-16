import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { ReviewsClient } from "@/components/restaurant-panel/ReviewsClient"

export default async function RestaurantReviewsPage() {
  const token = await getAccessToken()
  const { data } = await apiRequest<any>("/reviews/my-restaurant?limit=50", { accessToken: token })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Izohlar</h1>
        <p className="text-sm text-muted-foreground">Restoran va mahsulotlar bo‘yicha izohlar</p>
      </div>
      <ReviewsClient reviews={data?.data || []} />
    </div>
  )
}
