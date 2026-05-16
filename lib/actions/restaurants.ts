"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"

function slugify(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").trim()
}

export async function createRestaurantAction(data: any) {
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
        slug: slugify(data.name),
        owner_phone: data.owner_phone,
        is_active: true,
      },
      accessToken: token,
    })
    revalidatePath("/restaurants")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Xatolik yuz berdi" }
  }
}

export async function updateRestaurantAction(id: string, data: any) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/restaurants/${id}`, { method: "PATCH", body: {
      ...data,
      owner_phone: data.owner_phone || undefined,
    }, accessToken: token })
    revalidatePath("/restaurants")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Xatolik yuz berdi" }
  }
}

export async function deleteRestaurantAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/restaurants/${id}`, { method: "DELETE", accessToken: token })
    revalidatePath("/restaurants")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Xatolik yuz berdi" }
  }
}

export async function toggleRestaurantActiveAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }

  try {
    await apiRequest(`/restaurants/${id}/toggle-open`, { method: "PATCH", accessToken: token })
    revalidatePath("/restaurants")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Xatolik yuz berdi" }
  }
}
