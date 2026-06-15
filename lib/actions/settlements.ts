"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"
import type { SettlementPreview } from "@/types"

export async function createSettlementAction(body: {
  restaurant_id: string
  period_start: string
  period_end: string
  payment_note?: string
}) {
  const token = await getAccessToken()
  if (!token) return { success: false as const, error: "Avtorizatsiya xatosi" }

  try {
    const res = await apiRequest("/settlements", {
      method: "POST",
      body,
      accessToken: token,
    })
    revalidatePath("/settlements")
    return { success: true as const, data: res.data }
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" }
  }
}

export async function previewSettlementAction(params: {
  restaurant_id: string
  period_start: string
  period_end: string
}) {
  const token = await getAccessToken()
  if (!token) return { success: false as const, error: "Avtorizatsiya xatosi" }

  const qs = new URLSearchParams()
  qs.set("restaurant_id", params.restaurant_id)
  qs.set("period_start", params.period_start)
  qs.set("period_end", params.period_end)

  try {
    const res = await apiRequest<SettlementPreview>(`/settlements/preview?${qs}`, {
      method: "GET",
      accessToken: token,
    })
    return { success: true as const, data: res.data }
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" }
  }
}

export async function markSettlementPaidAction(id: string, body: { payment_note?: string }) {
  const token = await getAccessToken()
  if (!token) return { success: false as const, error: "Avtorizatsiya xatosi" }

  try {
    const res = await apiRequest(`/settlements/${id}/mark-paid`, {
      method: "PATCH",
      body,
      accessToken: token,
    })
    revalidatePath("/settlements")
    return { success: true as const, data: res.data }
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" }
  }
}
