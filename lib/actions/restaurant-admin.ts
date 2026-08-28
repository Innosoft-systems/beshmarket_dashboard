"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"
import type { Order } from "@/types/order"

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

async function withToken<T>(fn: (token: string) => Promise<T>): Promise<ActionResult<T>> {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }
  try {
    return { success: true, data: await fn(token) }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof ApiError ? error.message : "Xatolik yuz berdi",
    }
  }
}

export interface WalletTransaction {
  _id: string
  type: "topup" | "online_order_credit" | "cash_commission" | "correction"
  amount: number
  balance_after: number
  title?: string
  description?: string
  payment_method?: string
  created_by?: { _id: string; username?: string; full_name?: string } | null
  createdAt: string
}

export interface WalletPage {
  transactions: WalletTransaction[]
  pagination: { page: number; totalPages: number; total: number }
}

/**
 * One page of the ledger, optionally narrowed to money in or money out.
 *
 * The page is fetched through a server action rather than the browser so the
 * session token never leaves the server — the same reason the rest of the
 * dashboard proxies its reads.
 */
export async function loadWalletPageAction(
  restaurantId: string,
  page: number,
  direction?: "credit" | "debit",
) {
  return withToken(async token => {
    const params = new URLSearchParams({ page: String(page), limit: "20" })
    if (direction) params.set("direction", direction)
    const res = await apiRequest<WalletPage>(
      `/restaurants/admin/${restaurantId}/wallet?${params}`,
      { accessToken: token },
    )
    return res.data
  })
}

export interface OrdersPage {
  data: Order[]
  pagination: { page: number; totalPages: number; total: number }
}

export async function loadRestaurantOrdersAction(restaurantId: string, page: number) {
  return withToken(async token => {
    const res = await apiRequest<OrdersPage>(
      `/orders?restaurant_id=${restaurantId}&page=${page}&limit=20`,
      { accessToken: token },
    )
    return res.data
  })
}

/**
 * Move money into or out of a venue's wallet.
 *
 * `amount` is signed the way the ledger is: positive credits, negative debits.
 */
export async function adjustRestaurantBalanceAction(
  restaurantId: string,
  amount: number,
  reason: string,
) {
  return withToken(async token => {
    const res = await apiRequest<{ balance: number; reserved_balance: number }>(
      `/restaurants/admin/${restaurantId}/wallet/adjust`,
      { method: "POST", body: { amount, reason }, accessToken: token },
    )
    revalidatePath(`/restaurants/${restaurantId}`)
    revalidatePath("/balances")
    return res.data
  })
}
