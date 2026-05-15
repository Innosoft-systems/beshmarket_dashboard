import { apiRequest } from "./client";
import type { Order } from "@/types";
import type { PaginatedResponse } from "@/types";

export interface GetOrdersParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export async function getOrders(params: GetOrdersParams = {}, accessToken?: string) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page.toString());
  if (params.limit) searchParams.append("limit", params.limit.toString());
  if (params.status) searchParams.append("status", params.status);
  if (params.search) searchParams.append("search", params.search);
  if (params.date_from) searchParams.append("date_from", params.date_from);
  if (params.date_to) searchParams.append("date_to", params.date_to);

  const queryString = searchParams.toString();
  const endpoint = `/orders${queryString ? `?${queryString}` : ""}`;

  return apiRequest<PaginatedResponse<Order>>(endpoint, {
    method: "GET",
    accessToken,
  });
}
