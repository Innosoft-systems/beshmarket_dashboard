"use client"

import { useEffect } from "react"
import { io } from "socket.io-client"
import { useRouter } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export function useCourierSocket(accessToken: string | null) {
  const router = useRouter()

  useEffect(() => {
    if (!accessToken) return

    const socket = io(`${API_URL}/courier-location`, {
      auth: { token: accessToken },
      transports: ["websocket"],
    })

    socket.on("courier:status_changed", () => {
      router.refresh()
    })

    return () => { socket.disconnect() }
  }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps
}
