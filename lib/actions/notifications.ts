"use server"

import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"

interface BroadcastResponse {
  queued: boolean
  userCount: number
  firebase_configured: boolean
}

export async function sendBroadcastAction(data: {
  title: string
  body: string
  type: string
  target: "all" | "clients" | "couriers"
  image_url?: string
}) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya talab qilinadi. Qayta kiring." }
  try {
    const res = await apiRequest<BroadcastResponse>("/notifications/broadcast", {
      method: "POST",
      body: data,
      accessToken: token,
    })
    return {
      success: true,
      data: {
        sent: res.data.userCount,
        success: res.data.userCount,
        failed: 0,
        firebase_configured: res.data.firebase_configured,
      },
    }
  } catch (e: unknown) {
    const message = e instanceof ApiError ? e.message : "Server bilan bog‘lanib bo‘lmadi"
    return { success: false, error: message }
  }
}
