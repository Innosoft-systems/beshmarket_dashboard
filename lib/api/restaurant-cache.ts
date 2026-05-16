import { cache } from 'react'
import { getRmAccessToken } from '@/lib/auth/restaurant-session'
import { rmApiRequest } from '@/lib/api/restaurant-client'

export const getMyRestaurant = cache(async () => {
  const token = await getRmAccessToken()
  const res = await rmApiRequest<any>('/restaurants/my', { accessToken: token ?? '' }).catch(() => null)
  return { restaurant: res?.data ?? null, token: token ?? '' }
})
