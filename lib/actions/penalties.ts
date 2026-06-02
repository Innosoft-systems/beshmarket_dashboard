"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"

export async function getPenaltiesAction(params: {
  status?: string
  reason?: string
  courier_id?: string
  page?: number
  limit?: number
}) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }

  const qs = new URLSearchParams()
  if (params.status) qs.set("status", params.status)
  if (params.reason) qs.set("reason", params.reason)
  if (params.courier_id) qs.set("courier_id", params.courier_id)
  if (params.page) qs.set("page", String(params.page))
  if (params.limit) qs.set("limit", String(params.limit))

  try {
    const res = await apiRequest<unknown>(`/shifts/penalties?${qs}`, { accessToken: token })
    return { success: true, data: res.data }
  } catch (e: unknown) {
    return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" }
  }
}

export async function approvePenaltyAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }

  try {
    await apiRequest(`/shifts/penalties/${id}/approve`, { method: "PATCH", accessToken: token })
    revalidatePath("/penalties")
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" }
  }
}

export async function waivePenaltyAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }

  try {
    await apiRequest(`/shifts/penalties/${id}/waive`, { method: "PATCH", accessToken: token })
    revalidatePath("/penalties")
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" }
  }
}
