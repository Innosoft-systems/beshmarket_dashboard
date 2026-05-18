export interface Product {
  _id: string
  restaurant_id: string | { _id: string; name: string }
  menu_category_id: string | { _id: string; name_uz: string }
  name_uz: string
  name_ru: string
  name_en: string
  slug: string
  description_uz?: string
  description_ru?: string
  description_en?: string
  images: string[]
  price: number
  discount_price?: number
  weight?: string
  is_active: boolean
  is_available: boolean
  avg_rating: number
  review_count: number
  order_count: number
  createdAt: string
  updatedAt: string
}
