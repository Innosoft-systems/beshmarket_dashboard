export interface User {
  _id: string;
  full_name?: string;
  phone: string;
  avatar?: string;
  role: string;
  is_verified: boolean;
  is_blocked: boolean;
  createdAt: string;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  is_blocked?: string;
}
