import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"
import { ReviewsClient } from "@/components/restaurant-panel/ReviewsClient"

export default async function RestaurantReviewsPage() {
  const token = await getAccessToken()

  let reviews: any[] = []
  try {
    const { data } = await apiRequest<any>("/reviews/my-restaurant?limit=50", { accessToken: token })
    reviews = data?.data || []
  } catch (err) {
    if (!(err instanceof ApiError && (err.statusCode === 404 || err.statusCode === 403))) {
      throw err
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Izohlar</h1>
        <p className="text-sm text-muted-foreground">Restoran va mahsulotlar bo’yicha izohlar</p>
      </div>
      <ReviewsClient reviews={reviews} />
    </div>
  )
}
