import { apiRequest } from "./client";
import { PaginatedResponse } from "./users";

export interface Restaurant {
  _id: string;
  name: string;
  slug?: string;
  category_id?: string;
  owner_id?: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  description?: string;
  lat?: number;
  lng?: number;
  cuisine_tags?: string[];
  eco_score?: number;
  avg_prep_time?: number;
  min_order_amount?: number;
  delivery_fee?: number;
  commission_rate?: number;
  logo?: string;
  cover_image?: string;
  is_active: boolean;
  is_open: boolean;
  is_verified?: boolean;
  status?: string;
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

export async function createRestaurant(data: Partial<Restaurant>, accessToken: string) {
  return apiRequest<Restaurant>("/restaurants", {
    method: "POST",
    body: JSON.stringify(data),
    accessToken,
  });
}

export async function updateRestaurant(id: string, data: Partial<Restaurant>, accessToken: string) {
  return apiRequest<Restaurant>(`/restaurants/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    accessToken,
  });
}

export async function deleteRestaurant(id: string, accessToken: string) {
  return apiRequest<void>(`/restaurants/${id}`, {
    method: "DELETE",
    accessToken,
  });
}
