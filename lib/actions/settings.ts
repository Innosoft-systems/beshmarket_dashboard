"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"

export async function updateSettingAction(key: string, value: any) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/settings/${key}`, { method: "PATCH", body: { value }, accessToken: token })
    revalidatePath("/settings")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Xatolik yuz berdi" }
  }
}

export async function updateLegalPageAction(slug: string, data: any) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/legal-pages/admin/${slug}`, { method: "PATCH", body: data, accessToken: token })
    revalidatePath("/settings")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Xatolik yuz berdi" }
  }
}

export async function sendNotificationAction(data: { user_id: string; type: string; title: string; body: string }) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest("/notifications", { method: "POST", body: data, accessToken: token })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Xatolik yuz berdi" }
  }
}
