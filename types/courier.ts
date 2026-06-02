export interface CourierUser {
  _id: string;
  full_name?: string;
  phone?: string;
  avatar?: string;
}

export interface CourierProfile {
  _id: string;
  user_id: string | CourierUser;
  vehicle_type: string;
  vehicle_number?: string;
  status: string;
  is_verified: boolean;
  is_active: boolean;
  city: string;
  avg_rating: number;
  total_deliveries: number;
  total_earned: number;
  balance: number;
  createdAt: string;
}

export const COURIER_STATUSES = [
  { value: "online", label: "Onlayn", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "offline", label: "Oflayn", color: "bg-gray-100 text-gray-700 border-gray-200" },
  { value: "busy", label: "Band", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "on_delivery", label: "Yetkazmoqda", color: "bg-blue-100 text-blue-700 border-blue-200" },
] as const;
