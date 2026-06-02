"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"
import type { MenuCategory } from "@/types/menu-category"
import type { WorkingHours } from "@/types/working-hours"

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

async function withToken<T>(fn: (token: string) => Promise<T>): Promise<ActionResult<T>> {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    const data = await fn(token)
    return { success: true, data }
  } catch (e: unknown) {
    return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" }
  }
}

export async function updateMyRestaurantAction(data: Record<string, unknown>) {
  return withToken(async (token) => {
    await apiRequest("/restaurants/my", { method: "PATCH", body: data, accessToken: token })
    revalidatePath("/restaurant")
  })
}

export async function saveMyWorkingHoursAction(hours: WorkingHours[]) {
  return withToken(async (token) => {
    await apiRequest("/restaurants/my", { method: "PATCH", body: { working_hours: hours }, accessToken: token })
    revalidatePath("/restaurant/profile")
  })
}

export async function toggleMyRestaurantOpenAction() {
  return withToken(async (token) => {
    await apiRequest("/restaurants/my/toggle-open", { method: "PATCH", accessToken: token })
    revalidatePath("/restaurant")
  })
}

export async function createMyProductAction(data: Record<string, unknown>) {
  return withToken(async (token) => {
    await apiRequest("/products/my", { method: "POST", body: data, accessToken: token })
    revalidatePath("/restaurant/menu")
  })
}

export async function updateMyProductAction(id: string, data: Record<string, unknown>) {
  return withToken(async (token) => {
    await apiRequest(`/products/my/${id}`, { method: "PATCH", body: data, accessToken: token })
    revalidatePath("/restaurant/menu")
  })
}

export async function deleteMyProductAction(id: string) {
  return withToken(async (token) => {
    await apiRequest(`/products/my/${id}`, { method: "DELETE", accessToken: token })
    revalidatePath("/restaurant/menu")
  })
}

export async function createMyMenuCategoryAction(data: Record<string, unknown>) {
  return withToken(async (token) => {
    const res = await apiRequest<MenuCategory>("/menu-categories/my/menu", { method: "POST", body: data, accessToken: token })
    revalidatePath("/restaurant/categories")
    revalidatePath("/restaurant/menu")
    return res.data
  })
}

export async function updateMyMenuCategoryAction(id: string, data: Record<string, unknown>) {
  return withToken(async (token) => {
    await apiRequest(`/menu-categories/my/menu/${id}`, { method: "PATCH", body: data, accessToken: token })
    revalidatePath("/restaurant/categories")
    revalidatePath("/restaurant/menu")
  })
}

export async function deleteMyMenuCategoryAction(id: string) {
  return withToken(async (token) => {
    await apiRequest(`/menu-categories/my/menu/${id}`, { method: "DELETE", accessToken: token })
    revalidatePath("/restaurant/categories")
    revalidatePath("/restaurant/menu")
  })
}

export async function fetchMyCategoriesAction() {
  return withToken(async (token) => {
    const res = await apiRequest<MenuCategory[]>("/menu-categories/my/menu", { accessToken: token })
    return res.data
  })
}

export async function replyMyReviewAction(id: string, reply: string) {
  return withToken(async (token) => {
    await apiRequest(`/reviews/${id}/reply`, { method: "PATCH", body: { reply }, accessToken: token })
    revalidatePath("/restaurant/reviews")
  })
}

export async function createMyPromotionAction(data: Record<string, unknown>) {
  return withToken(async (token) => {
    await apiRequest("/promotions/my", { method: "POST", body: data, accessToken: token })
    revalidatePath("/restaurant/promotions")
  })
}

export async function updateMyPromotionAction(id: string, data: Record<string, unknown>) {
  return withToken(async (token) => {
    await apiRequest(`/promotions/my/${id}`, { method: "PATCH", body: data, accessToken: token })
    revalidatePath("/restaurant/promotions")
  })
}

export async function deleteMyPromotionAction(id: string) {
  return withToken(async (token) => {
    await apiRequest(`/promotions/my/${id}`, { method: "DELETE", accessToken: token })
    revalidatePath("/restaurant/promotions")
  })
}
