export interface User {
  _id: string;
  full_name?: string;
  phone: string;
  avatar?: string;
  role: string;
  is_verified: boolean;
  is_blocked: boolean;
  last_login_at?: string | null;
  createdAt: string;
  /** Present on admin user endpoints. Spending counts delivered orders only. */
  order_stats?: UserOrderStats;
}

export interface UserOrderStats {
  orders_count: number;
  delivered_count: number;
  cancelled_count: number;
  total_spent: number;
  first_order_at: string | null;
  last_order_at: string | null;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  is_blocked?: string;
}
