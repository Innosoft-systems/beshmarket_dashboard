"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"

export type AppPlatform = 'ios-mobile' | 'android-mobile' | 'ios-courier' | 'android-courier'

export type AppVersion = {
  _id: string
  platform: AppPlatform
  latestVersion: string
  minVersion: string
  storeUrl: string
  changelog: { uz: string; ru: string; en: string }
  isActive: boolean
  updatedAt: string
}

export async function getAppVersionsAction() {
  const token = await getAccessToken()
  if (!token) return { success: false as const, data: [] as AppVersion[], error: "Avtorizatsiyadan o'tilmagan" }

  try {
    const res = await apiRequest<AppVersion[]>("/app-versions", { accessToken: token })
    return { success: true as const, data: res.data }
  } catch (error: unknown) {
    return {
      success: false as const,
      data: [] as AppVersion[],
      error: error instanceof ApiError ? error.message : "Xatolik yuz berdi",
    }
  }
}

export async function upsertAppVersionAction(data: Omit<AppVersion, '_id' | 'updatedAt'>) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest("/app-versions", { method: "POST", body: data, accessToken: token })
    revalidatePath("/settings/app-versions")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function updateAppVersionAction(id: string, data: Partial<Omit<AppVersion, '_id' | 'updatedAt'>>) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/app-versions/${id}`, { method: "PATCH", body: data, accessToken: token })
    revalidatePath("/settings/app-versions")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function deleteAppVersionAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/app-versions/${id}`, { method: "DELETE", accessToken: token })
    revalidatePath("/settings/app-versions")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}
