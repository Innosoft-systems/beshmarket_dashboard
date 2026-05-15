import { apiRequest } from "./client";
import type { Restaurant, GetRestaurantsParams } from "@/types";
import type { PaginatedResponse } from "@/types";

export type { Restaurant, GetRestaurantsParams };

export async function getRestaurants(params: GetRestaurantsParams = {}, accessToken?: string) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page.toString());
  if (params.limit) searchParams.append("limit", params.limit.toString());
  if (params.search) searchParams.append("name", params.search);
  if (params.is_active !== undefined) searchParams.append("is_active", params.is_active.toString());

  const queryString = searchParams.toString();
  const endpoint = `/restaurants${queryString ? `?${queryString}` : ""}`;

  return apiRequest<PaginatedResponse<Restaurant>>(endpoint, {
    method: "GET",
    accessToken,
  });
}
