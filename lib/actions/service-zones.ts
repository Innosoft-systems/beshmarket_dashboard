"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"

export async function getServiceZonesAction() {
  const token = await getAccessToken()
  if (!token) return { success: false, data: [], error: "Avtorizatsiyadan o'tilmagan" }

  try {
    const res = await apiRequest<any[]>("/service-zones", { accessToken: token })
    return { success: true, data: res.data }
  } catch (error: any) {
    return { success: false, data: [], error: error.message || "Xatolik yuz berdi" }
  }
}

export async function createServiceZoneAction(data: any) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest("/service-zones", { method: "POST", body: data, accessToken: token })
    revalidatePath("/settings/zones")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Xatolik yuz berdi" }
  }
}

export async function updateServiceZoneAction(id: string, data: any) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/service-zones/${id}`, { method: "PATCH", body: data, accessToken: token })
    revalidatePath("/settings/zones")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Xatolik yuz berdi" }
  }
}

export async function deleteServiceZoneAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/service-zones/${id}`, { method: "DELETE", accessToken: token })
    revalidatePath("/settings/zones")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Xatolik yuz berdi" }
  }
}
