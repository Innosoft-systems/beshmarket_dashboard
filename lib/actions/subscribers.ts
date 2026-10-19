"use server"

import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"

export interface SubscriberTotals {
  active: number
  joined: number
  churned: number
  revenue: number
  orders: number
  logged_in: number
  logged_out: number
  logged_out_now: number
  buyers: number
  orders_total: number
  orders_delivered: number
  orders_cancelled: number
  orders_active: number
}

export interface SubscriberSeriesRow {
  period: string
  joined: number
  churned: number
  logged_in: number
  logged_out: number
  revenue: number
  orders: number
  buyers: number
  orders_total: number
  orders_delivered: number
  orders_cancelled: number
}

export interface SubscriberChange {
  active: number
  joined: number
  churned: number
  revenue: number
  logged_in: number
  logged_out: number
  buyers: number
  orders_total: number
  orders_delivered: number
  orders_cancelled: number
}

export interface SubscriberStats {
  period: {
    from: string
    to: string
    days: number
    previous_from: string
    previous_to: string
    granularity: "day" | "month"
  }
  current: SubscriberTotals
  previous: SubscriberTotals
  change: SubscriberChange
  series: SubscriberSeriesRow[]
}

export async function getSubscriberStatsAction(
  from: string,
  to: string,
): Promise<{ success: true; data: SubscriberStats } | { success: false; error: string }> {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    const res = await apiRequest<SubscriberStats>(
      `/stats/subscribers?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { accessToken: token },
    )
    return { success: true, data: res.data }
  } catch (e: unknown) {
    return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" }
  }
}
