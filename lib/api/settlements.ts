import { apiRequest } from "./client";
import type { Settlement, SettlementPreview } from "@/types";
import type { PaginatedResponse } from "@/types";

export interface GetSettlementsParams {
  page?: number;
  limit?: number;
  restaurant_id?: string;
  status?: string;
}

export interface CreateSettlementBody {
  restaurant_id: string;
  period_start: string;
  period_end: string;
  payment_note?: string;
}

export interface PreviewSettlementParams {
  restaurant_id: string;
  period_start: string;
  period_end: string;
}

export interface MarkPaidBody {
  payment_note?: string;
}

export async function getSettlements(params: GetSettlementsParams = {}, accessToken?: string) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page.toString());
  if (params.limit) searchParams.append("limit", params.limit.toString());
  if (params.restaurant_id) searchParams.append("restaurant_id", params.restaurant_id);
  if (params.status) searchParams.append("status", params.status);

  const queryString = searchParams.toString();
  const endpoint = `/settlements${queryString ? `?${queryString}` : ""}`;

  return apiRequest<PaginatedResponse<Settlement>>(endpoint, {
    method: "GET",
    accessToken,
  });
}

export async function createSettlement(body: CreateSettlementBody, accessToken?: string) {
  return apiRequest<Settlement>("/settlements", {
    method: "POST",
    body,
    accessToken,
  });
}

export async function previewSettlement(params: PreviewSettlementParams, accessToken?: string) {
  const searchParams = new URLSearchParams();
  searchParams.append("restaurant_id", params.restaurant_id);
  searchParams.append("period_start", params.period_start);
  searchParams.append("period_end", params.period_end);

  return apiRequest<SettlementPreview>(`/settlements/preview?${searchParams.toString()}`, {
    method: "GET",
    accessToken,
  });
}

export async function markSettlementPaid(id: string, body: MarkPaidBody = {}, accessToken?: string) {
  return apiRequest<Settlement>(`/settlements/${id}/mark-paid`, {
    method: "PATCH",
    body,
    accessToken,
  });
}
