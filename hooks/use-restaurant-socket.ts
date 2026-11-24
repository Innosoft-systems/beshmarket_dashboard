"use client"

import { useEffect, useRef, useCallback } from "react"
import { io } from "socket.io-client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { refreshAccessToken } from "@/lib/auth/refresh-client"
import { isTokenExpired } from "@/lib/auth/token-exp"
import { fetchPendingOrders } from "@/lib/pending-orders"
import { leaveOrderAlarm, playOrderAlarm, prewarmOrderAlarm, ringPendingOrder, stopOrderAlarm } from "@/lib/order-alarm"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

/** A connection that lived at least this long was healthy; reconnect at once. */
const HEALTHY_MS = 10_000
const MAX_RETRY_DELAY_MS = 30_000
const CATCH_UP_TRIES = 3
/** The server lets an expired token connect and drops it within moments. */
const EXPIRED_TOKEN_GRACE_MS = 3_000
const CATCH_UP_RETRY_MS = 5_000

function useThrottledCallback<T extends (...args: unknown[]) => void>(fn: T, wait: number): T {
  const lastRun = useRef(0)
  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastRun.current >= wait) {
        lastRun.current = now
        fn(...args)
      }
    },
    [fn, wait],
  ) as T
}

/**
 * One socket per mounted panel. It reads the token from a ref on every
 * (re)connect, so a rotated token neither drops the connection nor touches a
 * ringing alarm, and it retries for as long as the panel is open.
 */
export function useRestaurantSocket(accessToken: string | null) {
  const router = useRouter()
  const tokenRef = useRef(accessToken)
  const hasToken = Boolean(accessToken)

  const throttledRefresh = useThrottledCallback(() => router.refresh(), 2000)

  useEffect(() => {
    if (accessToken) tokenRef.current = accessToken
  }, [accessToken])

  useEffect(() => {
    if (!hasToken) return

    prewarmOrderAlarm()

    let disposed = false
    let reconnecting = false
    let usedToken: string | null = null
    let connectedAt = 0
    let quickDrops = 0
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const socket = io(`${API_URL}/orders`, {
      auth: (cb) => {
        usedToken = tokenRef.current
        cb({ token: usedToken })
      },
      transports: ["websocket"],
    })

    /**
     * For the two cases socket.io does not retry itself: the server dropped or
     * refused us. Usually the access token expired; if it keeps happening the
     * attempts are spaced out rather than hammering the API.
     */
    const reconnect = async (refresh: boolean) => {
      if (reconnecting || disposed) return
      reconnecting = true
      try {
        if (quickDrops > 1) {
          const delay = Math.min(MAX_RETRY_DELAY_MS, 1000 * 2 ** (quickDrops - 2))
          await new Promise<void>((resolve) => { retryTimer = setTimeout(resolve, delay) })
          if (disposed) return
        }
        // A server render may already have brought a newer token.
        if (refresh && tokenRef.current === usedToken) {
          const newToken = await refreshAccessToken()
          if (disposed) return
          if (!newToken) {
            window.location.href = "/restaurant/login"
            return
          }
          tokenRef.current = newToken
        }
      } finally {
        reconnecting = false
      }
      socket.connect()
    }

    const announce = (title: string, orderId: string, description?: string) => {
      toast.info(title, {
        description,
        duration: 15000,
        action: {
          label: "Ko'rish",
          onClick: () => {
            stopOrderAlarm(orderId)
            router.push(`/restaurant/orders/${orderId}`)
          },
        },
      })
    }

    /**
     * Nothing is replayed after a gap — an outage, a reload, a tab that was opened
     * late — so ring what is still waiting to be answered. What must not ring again
     * is decided in lib/order-alarm.ts. Asked of the API directly: a refresh only
     * helps the pages that show orders, and not every refresh gets committed.
     */
    const ringMissedOrders = async (token: string | null) => {
      if (!token) return
      for (let tries = 0; tries < CATCH_UP_TRIES; tries++) {
        const pending = await fetchPendingOrders(token)
        if (disposed) return
        if (pending) {
          pending.orders.forEach((order) => {
            if (!ringPendingOrder(order.id, order.acceptDeadline, pending.serverNow)) return
            // The page may not show orders at all; say what is ringing.
            announce(`Javob kutayotgan buyurtma: ${order.orderNumber}`, order.id)
          })
          return
        }
        await new Promise<void>((resolve) => setTimeout(resolve, CATCH_UP_RETRY_MS))
        // A reconnection asks again by itself.
        if (disposed || !socket.connected) return
      }
    }

    socket.on("connect", () => {
      const isReconnect = connectedAt > 0
      const token = usedToken
      connectedAt = Date.now()
      const catchUp = () => {
        void ringMissedOrders(token)
        // Not throttled: an event just before the drop must not swallow it.
        if (isReconnect) router.refresh()
      }
      if (!token || !isTokenExpired(token)) return catchUp()
      // About to be dropped: the connection with the refreshed token catches up.
      // If it is kept after all, it is this device's clock that is wrong.
      setTimeout(() => {
        if (!disposed && socket.connected && usedToken === token) catchUp()
      }, EXPIRED_TOKEN_GRACE_MS)
    })

    socket.on("order.new", (payload: { orderId: string; orderNumber: string; total: number }) => {
      // Also alarmed by the bell's `restaurant.notification` handler; whichever
      // event lands first rings, the other is deduped by orderId. Repeats until
      // the order is opened, answered or silenced, at most 60 s: a single chime
      // is missed in a busy kitchen. See lib/order-alarm.ts.
      playOrderAlarm(payload.orderId)
      announce(
        `Yangi buyurtma: ${payload.orderNumber}`,
        payload.orderId,
        `${payload.total.toLocaleString()} so'm`,
      )
      throttledRefresh()
    })

    socket.on("order.status.updated", (payload?: { orderId?: string; status?: string }) => {
      if (payload?.orderId && payload.status !== "pending") stopOrderAlarm(payload.orderId)
      throttledRefresh()
    })

    // Server drops the socket when the access token expires; socket.io does
    // not auto-reconnect after a server-initiated disconnect.
    socket.on("disconnect", (reason) => {
      if (reason !== "io server disconnect") return
      quickDrops = Date.now() - connectedAt < HEALTHY_MS ? quickDrops + 1 : 0
      void reconnect(true)
    })

    socket.on("connect_error", (err) => {
      // Network trouble: socket.io keeps retrying on its own.
      if (socket.active) return
      const isAuthError = err.message?.toLowerCase().includes("auth") ||
        (err as unknown as { data?: { statusCode?: number } }).data?.statusCode === 401
      quickDrops += 1
      void reconnect(isAuthError)
    })

    return () => {
      disposed = true
      if (retryTimer) clearTimeout(retryTimer)
      socket.disconnect()
      // The panel itself is being left (this provider lives in its layout).
      leaveOrderAlarm()
    }
  }, [hasToken]) // eslint-disable-line react-hooks/exhaustive-deps
}
