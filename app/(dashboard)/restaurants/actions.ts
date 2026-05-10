"use server"

import { revalidatePath } from "next/cache"
import { createRestaurant, updateRestaurant, deleteRestaurant } from "@/lib/api/restaurants"
import { getAccessToken } from "@/lib/auth/session"
import { RestaurantFormValues } from "@/components/restaurants/RestaurantForm"

function generateSlug(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').trim()
}

export async function createRestaurantAction(data: any) {
  const token = await getAccessToken()
  if (!token) throw new Error("Avtorizatsiyadan o'tilmagan")

  const payload = {
    ...data,
    owner_id: "65b900000000000000000000", // Dummy owner ID since there's no owner selector yet
    slug: generateSlug(data.name)
  }

  try {
    await createRestaurant(payload, token)
    revalidatePath("/restaurants")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Xatolik yuz berdi" }
  }
}

export async function updateRestaurantAction(id: string, data: any) {
  const token = await getAccessToken()
  if (!token) throw new Error("Avtorizatsiyadan o'tilmagan")

  try {
    await updateRestaurant(id, data, token)
    revalidatePath("/restaurants")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Xatolik yuz berdi" }
  }
}

export async function deleteRestaurantAction(id: string) {
  const token = await getAccessToken()
  if (!token) throw new Error("Avtorizatsiyadan o'tilmagan")

  try {
    await deleteRestaurant(id, token)
    revalidatePath("/restaurants")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Xatolik yuz berdi" }
  }
}
