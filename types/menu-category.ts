export interface MenuCategory {
  _id: string
  restaurant_id: string | { _id: string; name: string }
  name_uz: string
  name_ru: string
  name_en: string
  image?: string
  sort_order: number
  is_active: boolean
  createdAt: string
  updatedAt: string
}
