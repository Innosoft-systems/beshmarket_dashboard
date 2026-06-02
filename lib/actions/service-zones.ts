"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"
import type { ServiceZone } from "@/types/service-zone"

export async function getServiceZonesAction() {
  const token = await getAccessToken()
  if (!token) return { success: false as const, data: [] as ServiceZone[], error: "Avtorizatsiyadan o'tilmagan" }

  try {
    const res = await apiRequest<ServiceZone[]>("/service-zones", { accessToken: token })
    return { success: true, data: res.data }
  } catch (error: unknown) {
    return { success: false as const, data: [] as ServiceZone[], error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function createServiceZoneAction(data: Record<string, unknown>) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest("/service-zones", { method: "POST", body: data, accessToken: token })
    revalidatePath("/settings/zones")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function updateServiceZoneAction(id: string, data: Record<string, unknown>) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/service-zones/${id}`, { method: "PATCH", body: data, accessToken: token })
    revalidatePath("/settings/zones")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function deleteServiceZoneAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/service-zones/${id}`, { method: "DELETE", accessToken: token })
    revalidatePath("/settings/zones")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}
