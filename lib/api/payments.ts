import { apiRequest } from "./client";
import type { Payment } from "@/types";
import type { PaginatedResponse } from "@/types";

export interface GetPaymentsParams {
  page?: number;
  limit?: number;
  method?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  transaction_id?: string;
}

export async function getPayments(params: GetPaymentsParams = {}, accessToken?: string) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page.toString());
  if (params.limit) searchParams.append("limit", params.limit.toString());
  if (params.method) searchParams.append("method", params.method);
  if (params.status) searchParams.append("status", params.status);
  if (params.date_from) searchParams.append("date_from", params.date_from);
  if (params.date_to) searchParams.append("date_to", params.date_to);
  if (params.transaction_id) searchParams.append("transaction_id", params.transaction_id);

  const queryString = searchParams.toString();
  const endpoint = `/payments${queryString ? `?${queryString}` : ""}`;

  return apiRequest<PaginatedResponse<Payment>>(endpoint, {
    method: "GET",
    accessToken,
  });
}
