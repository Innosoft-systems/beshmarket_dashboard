"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"
import type { CourierFormValues, CourierDocumentsFormValues } from "@/schemas/courier"

export async function createCourierAction(data: CourierFormValues) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    const res = await apiRequest<{ _id: string }>("/couriers", {
      method: "POST",
      body: { ...data, is_verified: true, is_active: true },
      accessToken: token,
    })
    revalidatePath("/couriers")
    return { success: true, id: res.data?._id }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function upsertCourierDocumentsAdminAction(profileId: string, data: CourierDocumentsFormValues) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/couriers/${profileId}/documents`, {
      method: "PUT",
      body: data,
      accessToken: token,
    })
    revalidatePath(`/couriers/${profileId}`)
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function updateCourierAction(id: string, data: Partial<CourierFormValues> & Record<string, unknown>) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/couriers/${id}`, { method: "PATCH", body: data, accessToken: token })
    revalidatePath("/couriers")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function blockCourierUserAction(userId: string, block: boolean) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    const endpoint = block ? `/users/${userId}/block` : `/users/${userId}/unblock`
    await apiRequest(endpoint, { method: "PATCH", accessToken: token })
    revalidatePath("/couriers")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function deleteCourierAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/couriers/${id}`, { method: "DELETE", accessToken: token })
    revalidatePath("/couriers")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function updateDocumentStatusAction(profileId: string, status: 'verified' | 'rejected', rejection_reason?: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/couriers/${profileId}/documents/status`, {
      method: "PATCH",
      body: { status, rejection_reason },
      accessToken: token,
    })
    revalidatePath(`/couriers/${profileId}`)
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function correctionCourierAction(id: string, amount: number, note: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/couriers/${id}/correction`, {
      method: "POST",
      body: { amount, note },
      accessToken: token,
    })
    revalidatePath(`/couriers/${id}`)
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}
