"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"

async function withToken<T>(fn: (token: string) => Promise<T>) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await fn(token)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || "Xatolik yuz berdi" }
  }
}

export async function updateMyRestaurantAction(data: any) {
  return withToken(async (token) => {
    await apiRequest("/restaurants/my", { method: "PATCH", body: data, accessToken: token })
    revalidatePath("/restaurant")
  })
}

export async function toggleMyRestaurantOpenAction() {
  return withToken(async (token) => {
    await apiRequest("/restaurants/my/toggle-open", { method: "PATCH", accessToken: token })
    revalidatePath("/restaurant")
  })
}

export async function saveMyWorkingHoursAction(hours: any[]) {
  return withToken(async (token) => {
    await apiRequest("/restaurants/my/working-hours", {
      method: "POST",
      body: { hours },
      accessToken: token,
    })
    revalidatePath("/restaurant/working-hours")
  })
}

export async function createMyProductAction(data: any) {
  return withToken(async (token) => {
    await apiRequest("/products/my", { method: "POST", body: data, accessToken: token })
    revalidatePath("/restaurant/menu")
  })
}

export async function updateMyProductAction(id: string, data: any) {
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

export async function createMyMenuCategoryAction(data: any) {
  return withToken(async (token) => {
    await apiRequest("/menu-categories/my/menu", { method: "POST", body: data, accessToken: token })
    revalidatePath("/restaurant/menu")
  })
}

export async function deleteMyMenuCategoryAction(id: string) {
  return withToken(async (token) => {
    await apiRequest(`/menu-categories/my/menu/${id}`, { method: "DELETE", accessToken: token })
    revalidatePath("/restaurant/menu")
  })
}

export async function replyMyReviewAction(id: string, reply: string) {
  return withToken(async (token) => {
    await apiRequest(`/reviews/${id}/reply`, { method: "PATCH", body: { reply }, accessToken: token })
    revalidatePath("/restaurant/reviews")
  })
}

export async function createMyPromotionAction(data: any) {
  return withToken(async (token) => {
    await apiRequest("/promotions/my", { method: "POST", body: data, accessToken: token })
    revalidatePath("/restaurant/promotions")
  })
}

export async function updateMyPromotionAction(id: string, data: any) {
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
