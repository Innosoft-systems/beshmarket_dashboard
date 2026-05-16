"use server"

import { redirect } from "next/navigation"
import { adminLogin, sendOtp, verifyOtp } from "@/lib/api/auth"
import { setAuthTokens, clearAuthTokens } from "@/lib/auth/session"
import { ApiError } from "@/lib/api/client"

export interface LoginFormState {
  error?: string;
}

export interface RestaurantLoginFormState {
  error?: string;
  sent?: boolean;
  phone?: string;
}

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const username = formData.get("username") as string
  const password = formData.get("password") as string

  if (!username?.trim() || !password?.trim()) {
    return { error: "Username va parol kiritish shart" }
  }

  try {
    const { accessToken, refreshToken } = await adminLogin({ username, password })
    await setAuthTokens(accessToken, refreshToken)
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.statusCode === 401) return { error: "Login yoki parol noto'g'ri" }
      return { error: `Server xatosi: ${err.message}` }
    }
    return { error: "Ulanishda xatolik yuz berdi. Keyinroq urinib ko'ring." }
  }

  redirect("/dashboard")
}

export async function logoutAction(): Promise<void> {
  await clearAuthTokens()
  redirect("/login")
}

function normalizeUzPhone(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "")
  if (cleaned.startsWith("+998") && cleaned.length === 13) return cleaned
  if (cleaned.startsWith("998") && cleaned.length === 12) return `+${cleaned}`
  if (cleaned.length === 9) return `+998${cleaned}`
  return cleaned
}

export async function restaurantLoginAction(
  prevState: RestaurantLoginFormState,
  formData: FormData,
): Promise<RestaurantLoginFormState> {
  const intent = formData.get("intent") as string
  const phone = normalizeUzPhone((formData.get("phone") as string) || prevState.phone || "")
  const code = (formData.get("code") as string) || ""

  if (!/^\+998\d{9}$/.test(phone)) {
    return { error: "Telefon raqam +998XXXXXXXXX formatida bo'lishi kerak", phone }
  }

  if (intent === "send") {
    try {
      await sendOtp(phone)
      return { sent: true, phone }
    } catch (err) {
      return { error: err instanceof ApiError ? err.message : "OTP yuborishda xatolik", phone }
    }
  }

  if (!/^\d{6}$/.test(code)) {
    return { error: "6 xonali OTP kodni kiriting", sent: true, phone }
  }

  try {
    const { accessToken, refreshToken, user } = await verifyOtp(phone, code)
    if (user.role !== "restaurant") {
      return { error: "Bu panelga faqat restoran akkaunti kira oladi", sent: true, phone }
    }
    await setAuthTokens(accessToken, refreshToken)
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Kirishda xatolik yuz berdi", sent: true, phone }
  }

  redirect("/restaurant")
}
