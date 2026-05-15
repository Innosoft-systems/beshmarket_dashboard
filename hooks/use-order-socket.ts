"use client"

import { useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export function useOrderSocket(accessToken: string | null) {
  const router = useRouter()
  const socketRef = useRef<Socket | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!accessToken) return

    // Audio element
    audioRef.current = new Audio("/sounds/order_sound.wav")

    // Socket connection
    const socket = io(`${API_URL}/orders`, {
      auth: { token: accessToken },
      transports: ["websocket"],
    })

    socket.on("connect", () => {
      console.log("[WS] Connected to orders namespace")
    })

    socket.on("order.new", (payload: { orderNumber: string; restaurantName: string; total: number }) => {
      // Audio alert
      audioRef.current?.play().catch(() => {})

      // Toast notification
      toast.info(`Yangi buyurtma: ${payload.orderNumber}`, {
        description: `${payload.restaurantName} — ${payload.total.toLocaleString()} so'm`,
        duration: 10000,
      })

      // Refresh data
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
