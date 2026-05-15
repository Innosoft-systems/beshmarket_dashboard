export interface OrderItem {
  product_id: string;
  product_name: string;
  product_image?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Order {
  _id: string;
  order_number: string;
  client_id: any;
  restaurant_id: any;
  courier_id?: any;
  items: OrderItem[];
  status: string;
  payment_status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  cancel_reason?: string;
  createdAt: string;
}

export const ORDER_STATUSES = [
  { value: "pending", label: "Kutilmoqda", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "accepted", label: "Qabul qilindi", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "ready", label: "Tayyor", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "on_way", label: "Yo'lda", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { value: "delivered", label: "Yetkazildi", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "rejected", label: "Bekor qilindi", color: "bg-red-100 text-red-700 border-red-200" },
] as const;
