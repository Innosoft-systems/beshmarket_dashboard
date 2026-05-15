import { apiRequest } from "./client";
import type { CourierProfile } from "@/types";

export async function getCouriers(accessToken?: string) {
  return apiRequest<CourierProfile[]>("/couriers", {
    method: "GET",
    accessToken,
  });
}
