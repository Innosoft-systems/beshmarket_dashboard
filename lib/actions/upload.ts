"use server"

import { getAccessToken } from "@/lib/auth/session"

export async function getUploadToken() {
  return await getAccessToken() || null
}
