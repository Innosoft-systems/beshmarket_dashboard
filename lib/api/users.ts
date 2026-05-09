import { apiRequest } from "./client";

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

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export async function getUsers(params: GetUsersParams = {}, accessToken?: string) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page.toString());
  if (params.limit) searchParams.append("limit", params.limit.toString());
  if (params.search) searchParams.append("search", params.search);
  if (params.role) searchParams.append("role", params.role);

  const queryString = searchParams.toString();
  const endpoint = `/users${queryString ? `?${queryString}` : ""}`;

  return apiRequest<PaginatedResponse<User>>(endpoint, {
    method: "GET",
    accessToken,
  });
}
