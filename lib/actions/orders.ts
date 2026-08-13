"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"

export async function updateOrderStatusAction(id: string, status: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/orders/${id}/status`, { method: "PATCH", body: { status }, accessToken: token })
    revalidatePath("/orders")
    revalidatePath("/restaurant/orders")
    revalidatePath("/restaurant/planshet-orders")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

/**
 * Move the kitchen track. Separate from the delivery status on purpose: the
 * restaurant marks food ready whether or not a courier has been found yet.
 */
export async function updateKitchenStatusAction(id: string, kitchen_status: "preparing" | "ready") {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/orders/${id}/kitchen-status`, {
      method: "PATCH",
      body: { kitchen_status },
      accessToken: token,
    })
    revalidatePath("/orders")
    revalidatePath("/restaurant/orders")
    revalidatePath("/restaurant/planshet-orders")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function cancelOrderAction(id: string, reason: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/orders/${id}/cancel`, { method: "POST", body: { cancel_reason: reason }, accessToken: token })
    revalidatePath("/orders")
    revalidatePath("/restaurant/orders")
    revalidatePath("/restaurant/planshet-orders")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function assignCourierAction(orderId: string, courierId: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/orders/${orderId}/assign-courier`, { method: "PATCH", body: { courier_id: courierId }, accessToken: token })
    revalidatePath("/orders")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function assignGroupCourierAction(groupId: string, courierId: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/orders/group/${groupId}/assign-courier`, { method: "PATCH", body: { courier_id: courierId }, accessToken: token })
    revalidatePath("/orders")
    revalidatePath(`/orders/group/${groupId}`)
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}
