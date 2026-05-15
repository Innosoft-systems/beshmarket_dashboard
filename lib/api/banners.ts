import { apiRequest } from "./client";
import type { Banner } from "@/types";

export async function getBanners(accessToken?: string) {
  return apiRequest<Banner[]>("/banners/admin/all", {
    method: "GET",
    accessToken,
  });
}
