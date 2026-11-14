"use server"

import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"
import type { EnableMaintenanceBody, MaintenanceAdminView } from "@/lib/maintenance"

/** Platform pause, admin-only endpoints (see .agents/reports/pause-backend.md). */

type Result =
  | { success: true; data: MaintenanceAdminView }
  | { success: false; error: string }

async function call(endpoint: string, method: "GET" | "POST" | "DELETE", body?: unknown): Promise<Result> {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }
  try {
    const res = await apiRequest<MaintenanceAdminView>(endpoint, { method, body, accessToken: token })
    return { success: true, data: res.data }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function getMaintenanceAction(): Promise<Result> {
  return call("/settings/maintenance", "GET")
}

export async function enableMaintenanceAction(body: EnableMaintenanceBody): Promise<Result> {
  return call("/settings/maintenance", "POST", body)
}

export async function extendMaintenanceAction(minutes: number): Promise<Result> {
  return call("/settings/maintenance/extend", "POST", { minutes })
}

export async function disableMaintenanceAction(): Promise<Result> {
  return call("/settings/maintenance", "DELETE")
}
