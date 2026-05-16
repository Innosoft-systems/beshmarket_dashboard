"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"

export async function createPromotionAction(data: any) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest("/promotions", { method: "POST", body: data, accessToken: token })
    revalidatePath("/promotions")
    return { success: true }
  } catch (e: any) { return { success: false, error: e.message } }
}

export async function updatePromotionAction(id: string, data: any) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest(`/promotions/${id}`, { method: "PATCH", body: data, accessToken: token })
    revalidatePath("/promotions")
    return { success: true }
  } catch (e: any) { return { success: false, error: e.message } }
}

export async function deletePromotionAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest(`/promotions/${id}`, { method: "DELETE", accessToken: token })
    revalidatePath("/promotions")
    return { success: true }
  } catch (e: any) { return { success: false, error: e.message } }
}
