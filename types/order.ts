export interface OrderItem {
  product_id: string
  product_name: string
  product_image?: string
  quantity: number
  unit_price: number
  variant_label?: string
  selected_modifiers?: {
    group_id: string
    option_id: string
    group_name_uz?: string
    name_uz: string
    price: number
    quantity: number
    total: number
  }[]
  special_instructions?: string
  line_total: number
}

export interface OrderClient {
  _id: string
  full_name?: string
  phone?: string
}

export interface OrderRestaurant {
  _id?: string
  name: string
  /** 'market' swaps cooking wording ("Tayyor") for picking wording ("Yig'ildi"). */
  type?: "restaurant" | "market"
}

export interface OrderAddress {
  _id: string
  label?: string
  address?: string
  full_address?: string
  city?: string
  district?: string
  street?: string
  entrance?: string
  floor?: string
  apartment?: string
  comment?: string
}

export interface Order {
  _id: string
  order_number: string
  client_id: string | OrderClient | null
  restaurant_id: string | OrderRestaurant | null
  courier_id?: string | OrderClient | null
  address_id?: string | OrderAddress | null
  items: OrderItem[]
  /** Delivery track. Cooking progress is kitchen_status, which moves separately. */
  status: string
  kitchen_status?: "pending" | "preparing" | "ready"
  kitchen_ready_at?: string | null
  /** While pending: when the order auto-cancels if the restaurant stays silent. */
  restaurant_accept_deadline?: string | null
  payment_status: string
  payment_method?: "cash" | "payme" | "click" | string
  delivery_type?: string
  estimated_prep_time?: number
  subtotal: number
  delivery_fee: number
  service_fee: number
  discount: number
  total: number
  courier_note?: string
  restaurant_note?: string
  cancel_reason?: string
  cancelled_by?: string
  estimated_delivery_time?: number
  completed_at?: string
  status_history?: { status: string; changed_by_role: string; note?: string; created_at: string }[]
  createdAt: string
  group_id?: string
}

export interface GroupedOrderRow {
  _isGroup: true
  group_id: string
  orders: Order[]
  _id: string
  order_number: string
  restaurantNames: string
  total: number
  status: string
  createdAt: string
}

export type OrderRow = (Order & { _isGroup?: false }) | GroupedOrderRow

export const ORDER_STATUSES = [
  { value: "pending",                  label: "Kutilmoqda",           color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "accepted",                 label: "Qabul qilindi",        color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "assigned",                 label: "Qabul kutilmoqda",     color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { value: "on_the_way_to_restaurant", label: "Restoranga ketmoqda",  color: "bg-violet-100 text-violet-700 border-violet-200" },
  { value: "arrived_at_restaurant",    label: "Restoranda",           color: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200" },
  { value: "picked_up",                label: "Olindi",               color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "arrived_at_customer",      label: "Manzilga yetdi",       color: "bg-teal-100 text-teal-700 border-teal-200" },
  { value: "ready",                    label: "Tayyor",               color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "on_way",                   label: "Yo'lda",               color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { value: "delivered",                label: "Yetkazildi",           color: "bg-green-100 text-green-700 border-green-200" },
  { value: "rejected",                 label: "Rad etildi",           color: "bg-red-100 text-red-700 border-red-200" },
  { value: "cancelled",                label: "Bekor qilindi",        color: "bg-red-100 text-red-700 border-red-200" },
] as const
