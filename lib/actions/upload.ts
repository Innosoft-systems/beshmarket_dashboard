"use server"

import { getAccessToken } from "@/lib/auth/session"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export async function uploadImageAction(formData: FormData) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan", url: "" }

  try {
    const res = await fetch(`${API_URL}/api/v1/upload/image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => null)
      return { success: false, error: err?.error || "Yuklashda xatolik", url: "" }
    }

    const json = await res.json()
    const url = json?.data?.url ?? json?.url ?? ""
    return { success: true, url, error: "" }
  } catch {
    return { success: false, error: "Server bilan bog'lanishda xatolik", url: "" }
  }
}
