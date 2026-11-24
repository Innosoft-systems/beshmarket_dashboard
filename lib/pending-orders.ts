const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export interface PendingOrder {
  id: string
  orderNumber: string
  acceptDeadline: string | null
}

export interface PendingOrders {
  orders: PendingOrder[]
  /** The server's clock when it answered, if it said. */
  serverNow: number | null
}

/** The restaurant's unanswered orders; `null` when they could not be fetched. */
export async function fetchPendingOrders(accessToken: string): Promise<PendingOrders | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/orders?status=pending&page=1&limit=50`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout?.(10_000),
    })
    if (!res.ok) return null
    const json = await res.json()
    const orders: unknown = json?.data?.data
    if (!Array.isArray(orders)) return null
    const timestamp = typeof json.timestamp === "string" ? Date.parse(json.timestamp) : NaN
    return {
      orders: orders
        .filter((order) => order?.status === "pending" && typeof order._id === "string")
        .map((order) => ({
          id: order._id,
          orderNumber: order.order_number ?? "",
          acceptDeadline: order.restaurant_accept_deadline ?? null,
        })),
      serverNow: Number.isFinite(timestamp) ? timestamp : null,
    }
  } catch {
    return null
  }
}
