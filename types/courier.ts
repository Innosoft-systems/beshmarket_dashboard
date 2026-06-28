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

export type DocumentStatus = 'pending' | 'verified' | 'rejected';

export interface CourierDocuments {
  _id: string;
  courier_id: string;
  // Shaxsiy
  birth_date?: string;
  gender?: 'male' | 'female';
  address?: string;
  // Passport
  passport_series: string;
  passport_number: string;
  passport_issued_date?: string;
  passport_expiry_date?: string;
  passport_photo_front?: string;
  passport_photo_back?: string;
  // Haydovchilik
  driver_license_number?: string;
  driver_license_expiry?: string;
  driver_license_photo?: string;
  // Status
  document_status: DocumentStatus;
  rejection_reason?: string;
  createdAt: string;
  updatedAt: string;
}

export const COURIER_STATUSES = [
  { value: "online", label: "Onlayn", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "offline", label: "Oflayn", color: "bg-gray-100 text-gray-700 border-gray-200" },
  { value: "busy", label: "Band", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "on_delivery", label: "Yetkazmoqda", color: "bg-blue-100 text-blue-700 border-blue-200" },
] as const;
