"use client"

import { useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"
import { useRouter } from "next/navigation"
import { refreshAccessToken } from "@/lib/auth/refresh-client"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export function useCourierSocket(accessToken: string | null) {
  const router = useRouter()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!accessToken) return

    function createSocket(token: string): Socket {
      const socket = io(`${API_URL}/courier-location`, {
        auth: { token },
        transports: ["websocket"],
        reconnectionAttempts: 5,
      })

      socket.on("courier:status_changed", () => {
        router.refresh()
      })

      socket.on("connect_error", async (err) => {
        const isAuthError = err.message?.toLowerCase().includes("auth") ||
          (err as unknown as { data?: { statusCode?: number } }).data?.statusCode === 401

        if (!isAuthError) return

        const newToken = await refreshAccessToken()
        if (!newToken) {
          if (typeof window !== "undefined") window.location.href = "/login"
          return
        }

        socket.disconnect()
        socketRef.current = createSocket(newToken)
      })

      return socket
    }

    socketRef.current = createSocket(accessToken)

    return () => {
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps
}
