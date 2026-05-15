import { apiRequest } from "./client";
import type { User, GetUsersParams } from "@/types";
import type { PaginatedResponse } from "@/types";

export type { User, GetUsersParams };

export async function getUsers(params: GetUsersParams = {}, accessToken?: string) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page.toString());
  if (params.limit) searchParams.append("limit", params.limit.toString());
  if (params.search) searchParams.append("search", params.search);
  if (params.role) searchParams.append("role", params.role);
  if (params.is_blocked) searchParams.append("is_blocked", params.is_blocked);

  const queryString = searchParams.toString();
  const endpoint = `/users${queryString ? `?${queryString}` : ""}`;

  return apiRequest<PaginatedResponse<User>>(endpoint, {
    method: "GET",
    accessToken,
  });
}
