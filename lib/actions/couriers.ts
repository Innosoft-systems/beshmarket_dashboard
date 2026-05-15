"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"

export async function createCourierAction(data: any) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest("/couriers", {
      method: "POST",
      body: { ...data, is_verified: true, is_active: true },
      accessToken: token,
    })
    revalidatePath("/couriers")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Xatolik yuz berdi" }
  }
}

export async function updateCourierAction(id: string, data: any) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/couriers/${id}`, { method: "PATCH", body: data, accessToken: token })
    revalidatePath("/couriers")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Xatolik yuz berdi" }
  }
}

export async function blockCourierUserAction(userId: string, block: boolean) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    const endpoint = block ? `/users/${userId}/block` : `/users/${userId}/unblock`
    await apiRequest(endpoint, { method: "PATCH", accessToken: token })
    revalidatePath("/couriers")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Xatolik yuz berdi" }
  }
}


export async function deleteCourierAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/couriers/${id}`, { method: "DELETE", accessToken: token })
    revalidatePath("/couriers")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Xatolik yuz berdi" }
  }
}
