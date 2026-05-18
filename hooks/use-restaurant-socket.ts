"use client"

import { useEffect, useRef, useCallback } from "react"
import { io, Socket } from "socket.io-client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn, wait],
  ) as T
}

export function useRestaurantSocket(accessToken: string | null) {
  const router = useRouter()
  const socketRef = useRef<Socket | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioEnabled = useRef(false)

  const throttledRefresh = useThrottledCallback(() => router.refresh(), 2000)

  useEffect(() => {
    const enableAudio = () => { audioEnabled.current = true }
    document.addEventListener("click", enableAudio, { once: true })
    return () => document.removeEventListener("click", enableAudio)
  }, [])

  useEffect(() => {
    if (!accessToken) return

    if (typeof window !== "undefined") {
      audioRef.current = new Audio("/sounds/order_sound.wav")
    }

    const socket = io(`${API_URL}/orders`, {
      auth: { token: accessToken },
      transports: ["websocket"],
    })

    socket.on("order.new", (payload: { orderId: string; orderNumber: string; total: number }) => {
      if (audioEnabled.current) {
        audioRef.current?.play().catch(() => {})
      }
      toast.info(`Yangi buyurtma: ${payload.orderNumber}`, {
        description: `${payload.total.toLocaleString()} so'm`,
        duration: 15000,
        action: {
          label: "Ko'rish",
          onClick: () => router.push(`/restaurant/orders/${payload.orderId}`),
        },
      })
      throttledRefresh()
    })

    socket.on("order.status.updated", () => {
      throttledRefresh()
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps
}
