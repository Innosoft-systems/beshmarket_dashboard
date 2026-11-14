import type { ProductSyncInfo } from "@/lib/product-sync"

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
  /** 1C fields (B5). Present on admin / panel reads, never on public ones. */
  external_id?: string
  sku?: string
  unit?: string
  /** null = stock not tracked. */
  stock?: number | null
  sync?: ProductSyncInfo | null
  avg_rating: number
  review_count: number
  order_count: number
  createdAt: string
  updatedAt: string
}
