"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"

export async function approveReviewAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest(`/reviews/${id}/approve`, { method: "PATCH", accessToken: token })
    revalidatePath("/reviews")
    return { success: true }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}

export async function rejectReviewAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest(`/reviews/${id}/reject`, { method: "PATCH", accessToken: token })
    revalidatePath("/reviews")
    return { success: true }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}

export async function replyReviewAction(id: string, reply: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest(`/reviews/${id}/reply`, { method: "PATCH", body: { reply }, accessToken: token })
    revalidatePath("/reviews")
    return { success: true }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}

export async function deleteReviewAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest(`/reviews/${id}`, { method: "DELETE", accessToken: token })
    revalidatePath("/reviews")
    return { success: true }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}
