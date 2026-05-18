export interface Promotion {
  _id: string
  code: string
  title_uz: string
  title_ru: string
  title_en: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  min_order_amount: number
  max_discount_amount?: number
  max_uses: number
  used_count: number
  max_uses_per_user: number
  restaurant_id?: string | { _id: string; name: string }
  starts_at: string
  expires_at: string
  is_active: boolean
  created_by?: string | { _id: string; phone: string }
  createdAt: string
  updatedAt: string
}
