"use client"

import { useRestaurantSocket } from "@/hooks/use-restaurant-socket"

export function RestaurantSocketProvider({ accessToken }: { accessToken: string }) {
  useRestaurantSocket(accessToken)
  return null
}
