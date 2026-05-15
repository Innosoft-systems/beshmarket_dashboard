"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"

export async function updateOrderStatusAction(id: string, status: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/orders/${id}/status`, { method: "PATCH", body: { status }, accessToken: token })
    revalidatePath("/orders")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Xatolik yuz berdi" }
  }
}

export async function cancelOrderAction(id: string, reason: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/orders/${id}/cancel`, { method: "POST", body: { reason }, accessToken: token })
    revalidatePath("/orders")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Xatolik yuz berdi" }
  }
}

export async function assignCourierAction(orderId: string, courierId: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/orders/${orderId}/assign-courier`, { method: "PATCH", body: { courier_id: courierId }, accessToken: token })
    revalidatePath("/orders")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Xatolik yuz berdi" }
  }
}
