"use server"

import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"

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
    const res = await apiRequest<{ queued: boolean; userCount: number; firebase_configured: boolean }>("/notifications/broadcast", {
      method: "POST",
      body: data,
      accessToken: token,
    })
    return { success: true, data: { sent: res.data.userCount, success: res.data.userCount, failed: 0, firebase_configured: res.data.firebase_configured } }
  } catch (e: any) {
    console.error("[sendBroadcastAction]", e?.status, e?.message)
    return { success: false, error: e?.message || "Server bilan bog'lanib bo'lmadi" }
  }
}
