"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"
import type { RestaurantFormValues } from "@/schemas/restaurant"

function slugify(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").trim()
}

export async function createRestaurantAction(data: RestaurantFormValues) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest("/restaurants", {
      method: "POST",
      body: {
        name: data.name,
        phone: data.phone,
        address: data.address,
        city: data.city,
        district: data.district,
        logo: data.logo || undefined,
        lat: Number.isFinite(data.lat as number) ? data.lat : undefined,
        lng: Number.isFinite(data.lng as number) ? data.lng : undefined,
        slug: slugify(data.name),
        owner_phone: data.owner_phone,
        owner_username: data.owner_username,
        owner_password: data.owner_password,
        type: data.type || "restaurant",
        order: data.order ?? 0,
        commission_rate: data.commission_rate,
        avg_prep_time: data.avg_prep_time,
        is_active: true,
      },
      accessToken: token,
    })
    revalidatePath("/restaurants")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function updateRestaurantAction(id: string, data: RestaurantFormValues) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    const { owner_password, lat, lng, ...rest } = data
    await apiRequest(`/restaurants/${id}`, { method: "PATCH", body: {
      ...rest,
      // Bo'sh maydon NaN bo'lib ketmasin — aks holda server 400 qaytaradi.
      lat: Number.isFinite(lat as number) ? lat : undefined,
      lng: Number.isFinite(lng as number) ? lng : undefined,
      owner_password: owner_password || undefined,
    }, accessToken: token })
    revalidatePath("/restaurants")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function deleteRestaurantAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/restaurants/${id}`, { method: "DELETE", accessToken: token })
    revalidatePath("/restaurants")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

/**
 * Opens or closes a venue. Named for what it does: it was called
 * `toggleRestaurantActive` while calling the open/close endpoint, and the menu
 * item above it read "Faol/Nofaol qilish" off `is_active` — so the admin
 * pressed one thing and changed another.
 *
 * Takes the wanted state rather than flipping, for the same reason the panel
 * does: a flip is decided by whatever the server holds, not by what the row
 * was showing when it was clicked.
 */
export async function setRestaurantOpenAction(id: string, isOpen: boolean) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/restaurants/${id}/open`, {
      method: "PATCH",
      body: { is_open: isOpen },
      accessToken: token,
    })
    revalidatePath("/restaurants")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}

export async function toggleRestaurantVisibilityAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/restaurants/${id}/toggle-visibility`, { method: "PATCH", accessToken: token })
    revalidatePath("/restaurants")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof ApiError ? error.message : "Xatolik yuz berdi" }
  }
}
