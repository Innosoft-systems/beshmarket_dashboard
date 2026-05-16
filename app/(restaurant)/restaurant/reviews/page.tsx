import { getRmAccessToken } from '@/lib/auth/restaurant-session'
import { apiRequest } from '@/lib/api/client'
import { RestaurantReviewsClient } from '@/components/restaurant/ReviewsClient'

export default async function ReviewsPage() {
  const token = await getRmAccessToken()

  const restaurantRes = await apiRequest<any>('/restaurants/my', { accessToken: token }).catch(() => null)
  const restaurant = restaurantRes?.data
  if (!restaurant) return <div className="p-6 text-destructive">Restoran topilmadi</div>

  const reviewsRes = await apiRequest<any>(`/reviews?restaurant_id=${restaurant._id}&limit=50`, { accessToken: token }).catch(() => ({ data: { data: [] } }))
  const reviews = reviewsRes.data?.data || reviewsRes.data || []
  const avgRating = reviews.length ? reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length : 0

  return (
    <RestaurantReviewsClient
      reviews={reviews}
      avgRating={avgRating}
      totalCount={reviews.length}
    />
  )
}
