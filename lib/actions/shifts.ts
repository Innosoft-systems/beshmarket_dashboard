"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"

interface BulkSlotsResult {
  created: number
  skipped: number
}

export async function createSlotAction(data: Record<string, unknown>) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest("/shifts/admin/slots", { method: "POST", body: data, accessToken: token })
    revalidatePath("/shifts")
    return { success: true }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}

export async function bulkCreateSlotsAction(data: Record<string, unknown>) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    const res = await apiRequest<BulkSlotsResult>("/shifts/admin/slots/bulk", { method: "POST", body: data, accessToken: token })
    revalidatePath("/shifts")
    return { success: true, data: res.data }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}

export async function updateSlotAction(id: string, data: Record<string, unknown>) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest(`/shifts/admin/slots/${id}`, { method: "PATCH", body: data, accessToken: token })
    revalidatePath("/shifts")
    return { success: true }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}

export async function deleteSlotAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest(`/shifts/admin/slots/${id}`, { method: "DELETE", accessToken: token })
    revalidatePath("/shifts")
    return { success: true }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}
