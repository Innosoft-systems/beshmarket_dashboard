export interface OrderItem {
  product_id: string
  product_name: string
  product_image?: string
  quantity: number
  unit_price: number
  line_total: number
}

export interface Order {
  _id: string
  order_number: string
  client_id: any
  restaurant_id: any
  courier_id?: any
  address_id?: any
  items: OrderItem[]
  status: string
  payment_status: string
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
}

export const ORDER_STATUSES = [
  { value: "pending",                  label: "Kutilmoqda",           color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "accepted",                 label: "Qabul qilindi",        color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "assigned",                 label: "Kuryer tayinlandi",    color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { value: "on_the_way_to_restaurant", label: "Restoranga ketmoqda",  color: "bg-violet-100 text-violet-700 border-violet-200" },
  { value: "picked_up",                label: "Olindi",               color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "on_the_way_to_customer",   label: "Mijozga ketmoqda",     color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { value: "arrived_at_customer",      label: "Manzilga yetdi",       color: "bg-teal-100 text-teal-700 border-teal-200" },
  { value: "ready",                    label: "Tayyor",               color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "on_way",                   label: "Yo'lda",               color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { value: "delivered",                label: "Yetkazildi",           color: "bg-green-100 text-green-700 border-green-200" },
  { value: "rejected",                 label: "Bekor qilindi",        color: "bg-red-100 text-red-700 border-red-200" },
  { value: "cancelled",                label: "Bekor qilindi",        color: "bg-red-100 text-red-700 border-red-200" },
] as const
