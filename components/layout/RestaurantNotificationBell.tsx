"use client"

import { useState, useEffect, useTransition, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { io, Socket } from "socket.io-client"
import { Bell, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useFcmToken } from "@/hooks/use-fcm-token"
import { toast } from "sonner"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

interface NotificationPayload {
  _id: string
  type: string
  title: string
  body: string
  data?: Record<string, string>
  is_read: boolean
  createdAt: string
}

const TYPE_ICONS: Record<string, string> = {
  new_order: "🛒",
  order_status_on_way: "🚴",
  order_status_delivered: "✅",
  order_status_rejected: "❌",
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "Hozirgina"
  if (m < 60) return `${m} daq oldin`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} soat oldin`
  return `${Math.floor(h / 24)} kun oldin`
}

interface Props {
  accessToken: string
  initialCount: number
}

export function RestaurantNotificationBell({ accessToken, initialCount }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(initialCount)
  const [notifications, setNotifications] = useState<NotificationPayload[]>([])
  const [loaded, setLoaded] = useState(false)
  const [marking, setMarking] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useFcmToken(accessToken)

  const stopSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }
  }, [])

  const playSound = useCallback(() => {
    stopSound()
    if (typeof window === "undefined") return
    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/sound.mp3")
      audioRef.current.loop = true
    }
    audioRef.current.play().catch(() => {})
    stopTimerRef.current = setTimeout(stopSound, 60_000)
  }, [stopSound])


  // WebSocket connection for real-time notifications
  useEffect(() => {
    if (!accessToken) return

    const socket = io(`${API_URL}/orders`, {
      auth: { token: accessToken },
      transports: ["websocket"],
    })

    socket.on("restaurant.notification", (payload: NotificationPayload) => {
      setUnread(prev => prev + 1)
      setNotifications(prev => [payload, ...prev].slice(0, 20))
      if (payload.type === "new_order") playSound()
      const icon = TYPE_ICONS[payload.type] || "🔔"
      toast.info(`${icon} ${payload.title}`, {
        description: payload.body,
        duration: 8000,
        action: payload.data?.link
          ? { label: "Ko'rish", onClick: () => router.push(payload.data!.link) }
          : undefined,
      })
    })

    socketRef.current = socket
    return () => { socket.disconnect() }
  }, [accessToken, playSound]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => { stopSound() }
  }, [stopSound])

  const loadNotifications = async () => {
    if (loaded) return
    try {
      const res = await fetch(`${API_URL}/api/v1/restaurant-notifications?limit=20`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const json = await res.json()
      setNotifications(json.data?.data || json.data || [])
      setLoaded(true)
    } catch { /* ignore */ }
  }

  const markAllRead = async () => {
    setMarking(true)
    await fetch(`${API_URL}/api/v1/restaurant-notifications/read-all`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    setMarking(false)
    setUnread(0)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const markOne = async (id: string, link?: string) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, is_read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
    await fetch(`${API_URL}/api/v1/restaurant-notifications/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (link) {
      setOpen(false)
      startTransition(() => router.push(link))
    }
  }

  const handleToggle = () => {
    stopSound()
    setOpen(v => !v)
    if (!open) loadNotifications()
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("[data-restaurant-notif-bell]")) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div className="relative" data-restaurant-notif-bell="">
      <Button variant="ghost" size="icon" onClick={handleToggle} className="relative h-9 w-9" aria-label="Bildirishnomalar">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-96 rounded-xl border bg-background shadow-xl ring-1 ring-foreground/10">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-sm">Bildirishnomalar {unread > 0 && <Badge variant="destructive" className="ml-1 text-xs">{unread}</Badge>}</h3>
            {unread > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={markAllRead} disabled={marking}>
                <CheckCheck className="h-3.5 w-3.5" />
                Hammasini o'qi
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {loaded ? "Bildirishnomalar yo'q" : "Yuklanmoqda..."}
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n._id}
                  onClick={() => markOne(n._id, n.data?.link)}
                  className={`w-full text-left px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors flex items-start gap-3 ${!n.is_read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
                >
                  <span className="text-lg mt-0.5 shrink-0">{TYPE_ICONS[n.type] || "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium truncate ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                        {n.title}
                      </p>
                      {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{n.body}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
