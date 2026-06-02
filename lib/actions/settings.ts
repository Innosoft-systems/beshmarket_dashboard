"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"

interface FaqItem {
  question_uz: string
  answer_uz: string
  question_ru: string
  answer_ru: string
  question_en: string
  answer_en: string
  is_active?: boolean
}

export async function updateSettingAction(key: string, value: unknown) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/settings/${key}`, { method: "PATCH", body: { value }, accessToken: token })
    revalidatePath("/settings")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function updateLegalPageAction(slug: string, data: Record<string, unknown>) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/legal-pages/admin/${slug}`, { method: "PATCH", body: data, accessToken: token })
    revalidatePath("/settings")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function sendNotificationAction(data: { user_id: string; type: string; title: string; body: string }) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest("/notifications", { method: "POST", body: data, accessToken: token })
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function getCourierFaqAction() {
  const token = await getAccessToken()
  if (!token) return { success: false, data: null }

  try {
    const res = await apiRequest<{ faqs: FaqItem[] }>("/support/courier-help/raw", { accessToken: token })
    return { success: true, data: res.data }
  } catch {
    return { success: false, data: null }
  }
}

export async function updateCourierFaqAction(faqs: FaqItem[]) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest("/support/courier-help", { method: "PUT", body: { faqs }, accessToken: token })
    revalidatePath("/settings/couriers")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}
