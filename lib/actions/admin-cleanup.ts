"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken, getSessionRole } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"

export async function cleanupSectionAction(
  resource: string,
  pathname: string,
  restaurantId?: string,
) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya talab qilinadi" }

  // Server actions are dispatched by action id, so the path-based role guard in
  // middleware.ts never runs for them: a restaurant session can invoke this from
  // any page it is allowed to load. Guard the mass-delete explicitly.
  const role = await getSessionRole()
  if (role !== "admin") {
    return { success: false, error: "Bu amal uchun ruxsat yo'q" }
  }

  try {
    const query = new URLSearchParams({ confirm: resource })
    if (restaurantId) query.set("restaurantId", restaurantId)
    const { data } = await apiRequest<{ deletedCount: number }>(`/admin/cleanup/${resource}?${query}`, {
      method: "DELETE",
      accessToken: token,
    })
    revalidatePath(pathname)
    return { success: true, deletedCount: data.deletedCount }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof ApiError ? error.message : "Ma'lumotlarni tozalashda xatolik yuz berdi",
    }
  }
}
