"use server"

import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"

export async function sendBroadcastAction(data: {
  title: string
  body: string
  type: string
  target: "all" | "clients" | "couriers"
}) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    const res = await apiRequest<any>("/notifications/broadcast", {
      method: "POST",
      body: data,
      accessToken: token,
    })
    return { success: true, data: res.data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
