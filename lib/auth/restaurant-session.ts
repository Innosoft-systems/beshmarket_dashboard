import { cookies } from 'next/headers'

const ACCESS = 'rm_access_token'
const REFRESH = 'rm_refresh_token'
const OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 3600,
  path: '/',
}

export async function getRmAccessToken() {
  return (await cookies()).get(ACCESS)?.value
}
export async function getRmRefreshToken() {
  return (await cookies()).get(REFRESH)?.value
}
export async function setRmTokens(access: string, refresh: string) {
  const store = await cookies()
  store.set(ACCESS, access, OPTS)
  store.set(REFRESH, refresh, OPTS)
}
export async function clearRmTokens() {
  const store = await cookies()
  store.delete(ACCESS)
  store.delete(REFRESH)
}
