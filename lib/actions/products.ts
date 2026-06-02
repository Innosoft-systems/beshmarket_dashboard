"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"

export async function createProductAction(data: Record<string, unknown>) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest("/products", { method: "POST", body: data, accessToken: token })
    revalidatePath("/restaurants")
    return { success: true }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}

export async function updateProductAction(id: string, data: Record<string, unknown>) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest(`/products/${id}`, { method: "PATCH", body: data, accessToken: token })
    revalidatePath("/restaurants")
    return { success: true }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}

export async function deleteProductAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest(`/products/${id}`, { method: "DELETE", accessToken: token })
    revalidatePath("/restaurants")
    return { success: true }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}

export async function createMenuCategoryAction(data: Record<string, unknown>) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest("/menu-categories/menu", { method: "POST", body: data, accessToken: token })
    revalidatePath("/restaurants")
    return { success: true }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}

export async function deleteMenuCategoryAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest(`/menu-categories/menu/${id}`, { method: "DELETE", accessToken: token })
    revalidatePath("/restaurants")
    return { success: true }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}
