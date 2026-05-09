import { apiRequest } from "./client";
import { PaginatedResponse } from "./users";

export interface Restaurant {
  _id: string;
  name: string;
  category_id: string;
  phone: string;
  city: string;
  district: string;
  is_active: boolean;
  is_open: boolean;
  avg_rating: number;
}

export interface GetRestaurantsParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}

export async function getRestaurants(params: GetRestaurantsParams = {}, accessToken?: string) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page.toString());
  if (params.limit) searchParams.append("limit", params.limit.toString());
  if (params.search) searchParams.append("name", params.search); // restaurant search is usually by 'name'
  if (params.is_active !== undefined) searchParams.append("is_active", params.is_active.toString());

  const queryString = searchParams.toString();
  const endpoint = `/restaurants${queryString ? `?${queryString}` : ""}`;

  return apiRequest<PaginatedResponse<Restaurant>>(endpoint, {
    method: "GET",
    accessToken, // Restaurants might be public, but passing it just in case
  });
}
