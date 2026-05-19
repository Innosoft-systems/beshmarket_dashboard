"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { io } from "socket.io-client"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

interface Props {
  accessToken: string
  initialUnread: number
}

export function ChatBell({ accessToken, initialUnread }: Props) {
  const router = useRouter()
  const [unread, setUnread] = useState(initialUnread)
  const socketRef = useRef<ReturnType<typeof io> | null>(null)

  useEffect(() => {
    if (!accessToken) return
    const socket = io(`${API_URL}/chat`, {
      auth: { token: accessToken },
      transports: ["websocket"],
    })
    socketRef.current = socket

    socket.on("chat:message", (msg: { sender: string }) => {
      if (msg.sender === "user") {
        setUnread(prev => prev + 1)
      }
    })

    socket.on("chat:read", () => {
      // Unread count will reset when admin navigates to /chat
    })

    return () => { socket.disconnect() }
  }, [accessToken])

  const handleClick = () => {
    setUnread(0)
    router.push("/chat")
  }

  return (
    <Button variant="ghost" size="icon-sm" onClick={handleClick} className="relative">
      <MessageSquare className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Button>
  )
}
