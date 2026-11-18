"use server"

import { redirect } from "next/navigation"
import { adminLogin, restaurantLogin } from "@/lib/api/auth"
import { setAuthTokens, clearAuthTokens, getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"

export interface LoginFormState {
  error?: string;
}

export interface RestaurantLoginFormState {
  error?: string;
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
      if (err.statusCode === 400 || err.statusCode === 401) return { error: "Login yoki parol noto'g'ri" }
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

/**
 * The restaurant panel's "Chiqish". It revokes this device's session on the
 * server first (B8: the session id is in the access token, so other devices
 * stay logged in), then clears the cookies and goes to the restaurant login.
 * The server call is best effort: an expired token or an unreachable server
 * must not keep anybody from logging out of this device.
 */
export async function restaurantLogoutAction(): Promise<void> {
  const accessToken = await getAccessToken()
  if (accessToken) {
    try {
      await apiRequest("/auth/logout", {
        method: "POST",
        accessToken,
        signal: AbortSignal.timeout(5_000),
      })
    } catch {
      // Logged out locally anyway; the session then expires on its own.
    }
  }
  await clearAuthTokens()
  redirect("/restaurant/login")
}

export async function restaurantLoginAction(
  _prevState: RestaurantLoginFormState,
  formData: FormData,
): Promise<RestaurantLoginFormState> {
  const username = ((formData.get("username") as string) || "").trim().toLowerCase()
  const password = (formData.get("password") as string) || ""

  if (!username || !password) {
    return { error: "Username va parol kiritish shart" }
  }

  try {
    const { accessToken, refreshToken, user } = await restaurantLogin({ username, password })
    if (user.role !== "restaurant") {
      return { error: "Bu panelga faqat restoran akkaunti kira oladi" }
    }
    await setAuthTokens(accessToken, refreshToken)
  } catch (err) {
    if (err instanceof ApiError && (err.statusCode === 400 || err.statusCode === 401)) {
      return { error: "Login yoki parol noto'g'ri" }
    }
    return { error: err instanceof ApiError ? err.message : "Kirishda xatolik yuz berdi" }
  }

  redirect("/restaurant")
}
