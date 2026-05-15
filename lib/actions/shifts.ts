"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"

export async function createSlotAction(data: any) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest("/shifts/admin/slots", { method: "POST", body: data, accessToken: token })
    revalidatePath("/shifts")
    return { success: true }
  } catch (e: any) { return { success: false, error: e.message } }
}

export async function bulkCreateSlotsAction(data: any) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    const res = await apiRequest<any>("/shifts/admin/slots/bulk", { method: "POST", body: data, accessToken: token })
    revalidatePath("/shifts")
    return { success: true, data: res.data }
  } catch (e: any) { return { success: false, error: e.message } }
}

export async function updateSlotAction(id: string, data: any) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest(`/shifts/admin/slots/${id}`, { method: "PATCH", body: data, accessToken: token })
    revalidatePath("/shifts")
    return { success: true }
  } catch (e: any) { return { success: false, error: e.message } }
}

export async function deleteSlotAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest(`/shifts/admin/slots/${id}`, { method: "DELETE", accessToken: token })
    revalidatePath("/shifts")
    return { success: true }
  } catch (e: any) { return { success: false, error: e.message } }
}
