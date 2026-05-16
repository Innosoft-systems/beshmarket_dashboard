'use server'
import { redirect } from 'next/navigation'
import { setRmTokens, clearRmTokens } from '@/lib/auth/restaurant-session'

const API = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1`

export async function sendOtpAction(phone: string) {
  const res = await fetch(`${API}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  })
  const json = await res.json()
  if (!res.ok) return { success: false, error: json.error ?? json.message ?? 'Xatolik' }
  return { success: true }
}

export async function verifyOtpAction(phone: string, code: string) {
  const res = await fetch(`${API}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  })
  const json = await res.json()
  if (!res.ok) return { success: false, error: json.error ?? json.message ?? "OTP noto'g'ri" }
  const data = json.data ?? json
  if (data.user?.role !== 'restaurant') return { success: false, error: 'Bu raqam restoran emas' }
  await setRmTokens(data.accessToken, data.refreshToken)
  return { success: true }
}

export async function logoutRestaurantAction() {
  await clearRmTokens()
  redirect('/restaurant/login')
}
