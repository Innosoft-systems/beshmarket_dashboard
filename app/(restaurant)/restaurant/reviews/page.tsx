import { getMyRestaurant } from '@/lib/api/restaurant-cache'
import { rmApiRequest } from '@/lib/api/restaurant-client'
import { RestaurantReviewsClient } from '@/components/restaurant/ReviewsClient'

export default async function ReviewsPage() {
  const { restaurant, token } = await getMyRestaurant()
  const reviewsRes = await rmApiRequest<any>(`/reviews?restaurant_id=${restaurant._id}&limit=50`, { accessToken: token }).catch(() => ({ data: { data: [] } }))
  const reviews = reviewsRes.data?.data || reviewsRes.data || []
  const avgRating = reviews.length ? reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length : 0
  return <RestaurantReviewsClient reviews={reviews} avgRating={avgRating} totalCount={reviews.length} />
}
