import { apiRequest } from "./client";
import type { Order } from "@/types";
import type { PaginatedResponse } from "@/types";

export interface GetOrdersParams {
  page?: number;
  limit?: number;
  status?: string;
  order_number?: string;
}

export async function getOrders(params: GetOrdersParams = {}, accessToken?: string) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page.toString());
  if (params.limit) searchParams.append("limit", params.limit.toString());
  if (params.status) searchParams.append("status", params.status);
  if (params.order_number) searchParams.append("order_number", params.order_number);

  const queryString = searchParams.toString();
  const endpoint = `/orders${queryString ? `?${queryString}` : ""}`;

  return apiRequest<PaginatedResponse<Order>>(endpoint, {
    method: "GET",
    accessToken,
  });
}
