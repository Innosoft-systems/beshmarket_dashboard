export interface Review {
  _id: string
  order_id?: string | { _id: string; order_number: string }
  user_id: string | { _id: string; full_name?: string; phone?: string }
  target_type: string
  target_id: string
  rating: number
  comment?: string
  images: string[]
  status: "pending" | "approved" | "rejected"
  is_approved: boolean
  restaurant_reply?: string
  replied_at?: string
  createdAt: string
  updatedAt: string
}
