"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"

export async function createPromotionAction(data: Record<string, unknown>) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest("/promotions", { method: "POST", body: data, accessToken: token })
    revalidatePath("/promotions")
    return { success: true }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}

export async function updatePromotionAction(id: string, data: Record<string, unknown>) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest(`/promotions/${id}`, { method: "PATCH", body: data, accessToken: token })
    revalidatePath("/promotions")
    return { success: true }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}

export async function deletePromotionAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest(`/promotions/${id}`, { method: "DELETE", accessToken: token })
    revalidatePath("/promotions")
    return { success: true }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}
