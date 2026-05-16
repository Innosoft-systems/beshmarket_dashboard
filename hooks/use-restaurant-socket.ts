"use client"

import { useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export function useRestaurantSocket(accessToken: string | null) {
  const router = useRouter()
  const socketRef = useRef<Socket | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!accessToken) return

    audioRef.current = new Audio("/sounds/order_sound.wav")

    const socket = io(`${API_URL}/orders`, {
      auth: { token: accessToken },
      transports: ["websocket"],
    })

    socket.on("connect", () => {
      console.log("[WS] Restaurant connected to orders namespace")
    })

    socket.on("order.new", (payload: { orderId: string; orderNumber: string; total: number }) => {
      audioRef.current?.play().catch(() => {})
      toast.info(`Yangi buyurtma: ${payload.orderNumber}`, {
        description: `${payload.total.toLocaleString()} so'm`,
        duration: 15000,
        action: {
          label: "Ko'rish",
          onClick: () => router.push(`/restaurant/orders/${payload.orderId}`),
        },
      })
      router.refresh()
    })

    socket.on("order.status.updated", () => {
      router.refresh()
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps
}
