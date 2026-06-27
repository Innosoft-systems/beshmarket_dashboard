"use client"

import { useState, useEffect, useRef, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { io, Socket } from "socket.io-client"
import { Send, MessageSquare, ImagePlus, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getChatMessages, type Message } from "@/lib/api/chat"
import { refreshAccessToken } from "@/lib/auth/refresh-client"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

interface OrderSummary {
  _id: string
  order_number: string
  status: string
  total: number
  created_at: string
  restaurant_name?: string
}

interface Conversation {
  user_id: string
  user_name?: string
  user_phone?: string
  user_role?: string
  last_message: string
  last_sender: string
  last_at: string
  unread: number
  is_closed?: boolean
  order?: OrderSummary | null
}


const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Kutilmoqda",
  accepted: "Qabul qilindi",
  preparing: "Tayyorlanmoqda",
  assigned: "Kuryer tayinlandi",
  on_the_way_to_restaurant: "Restoranga ketmoqda",
  arrived_at_restaurant: "Restoranda",
  picked_up: "Olib ketildi",
  arrived_at_customer: "Mijoz eshigida",
  delivered: "Yetkazildi",
  cancelled: "Bekor qilindi",
}

interface Props {
  conversations: Conversation[]
  initialMessages: Message[]
  selectedUserId: string
  accessToken: string
}

function timeStr(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" })
  return d.toLocaleDateString("uz", { day: "numeric", month: "short" })
}

export function ChatClient({ conversations: initConvs, initialMessages, selectedUserId, accessToken }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [convs, setConvs] = useState<Conversation[]>(initConvs)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [typing, setTyping] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [hasMore, setHasMore] = useState(initialMessages.length >= 50)
  const [loadingOlder, setLoadingOlder] = useState(false)

  const socketRef = useRef<Socket | null>(null)
  const uploadAbortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedUserIdRef = useRef(selectedUserId)
  // true during initial load or conversation switch — use instant scroll, not smooth
  const isInitialScrollRef = useRef(true)

  const selectedConv = convs.find(c => c.user_id === selectedUserId)

  useEffect(() => { selectedUserIdRef.current = selectedUserId }, [selectedUserId])

  // Abort in-flight uploads on unmount
  useEffect(() => () => { uploadAbortRef.current?.abort() }, [])

  // Socket
  useEffect(() => {
    if (!accessToken) return

    function attachHandlers(s: Socket) {
      s.on("chat:message", (msg: Message) => {
        if (msg.user_id === selectedUserIdRef.current) {
          setMessages(prev => {
            if (prev.some(m => m._id === msg._id)) return prev
            if (msg.sender === "admin") {
              const optIdx = prev.findIndex(m => m._id.startsWith("opt-") && m.text === msg.text)
              if (optIdx !== -1) {
                const next = [...prev]
                next[optIdx] = msg
                return next
              }
            }
            return [...prev, msg]
          })
          if (msg.sender === "user") setTyping(false)
        }

        if (msg.sender === "user" && msg.user_id !== selectedUserIdRef.current) {
          new Audio("/sounds/order_sound.wav").play().catch(() => {})
          toast("Yangi xabar", { description: (msg.text || "📷 Rasm").slice(0, 80) })
        }

        setConvs(prev => {
          const idx = prev.findIndex(c => c.user_id === msg.user_id)
          const updated = { last_message: msg.text || "📷 Rasm", last_sender: msg.sender, last_at: msg.createdAt }
          if (idx === -1) {
            startTransition(() => router.refresh())
            return prev
          }
          const newConvs = [...prev]
          newConvs[idx] = {
            ...newConvs[idx],
            ...updated,
            unread: msg.sender === "user" && msg.user_id !== selectedUserIdRef.current
              ? (newConvs[idx].unread || 0) + 1
              : newConvs[idx].unread,
            ...(msg.sender === "user" ? { is_closed: false } : {}),
          }
          return newConvs.sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())
        })
      })

      s.on("chat:typing", (data: { userId?: string; sender?: string }) => {
        if (data.sender === "user" && data.userId === selectedUserIdRef.current) {
          setTyping(true)
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => setTyping(false), 3000)
        }
      })

      s.on("chat:closed", ({ userId }: { userId?: string }) => {
        if (userId) {
          setConvs(prev => prev.map(c => c.user_id === userId ? { ...c, is_closed: true } : c))
        }
      })

      s.on("chat:read", ({ userId }: { userId: string }) => {
        setConvs(prev => prev.map(c => c.user_id === userId ? { ...c, unread: 0 } : c))
      })
    }

    function createChatSocket(token: string): Socket {
      const s = io(`${API_URL}/chat`, {
        auth: { token },
        transports: ["websocket"],
        reconnectionAttempts: 5,
      })

      s.on("connect_error", async (err) => {
        const isAuthError = err.message?.toLowerCase().includes("auth") ||
          (err as unknown as { data?: { statusCode?: number } }).data?.statusCode === 401
        if (!isAuthError) return
        const newToken = await refreshAccessToken()
        if (!newToken) { window.location.href = "/login"; return }
        s.disconnect()
        const newSocket = createChatSocket(newToken)
        socketRef.current = newSocket
      })

      attachHandlers(s)
      return s
    }

    const socket = createChatSocket(accessToken)
    socketRef.current = socket

    return () => { socket.disconnect() }
  }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom when messages change — instant on initial, smart on new messages
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    if (isInitialScrollRef.current) {
      // Initial load or conversation switch — jump instantly
      el.scrollTop = el.scrollHeight
      isInitialScrollRef.current = false
      return
    }

    // New message arrived — only scroll if user is near the bottom (within 120px)
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 120) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // On conversation select — reset state and prepare for instant scroll
  useEffect(() => {
    isInitialScrollRef.current = true
    setMessages(initialMessages)
    setHasMore(initialMessages.length >= 50)
    setTyping(false)
    if (selectedUserId) {
      socketRef.current?.emit("chat:read", { userId: selectedUserId })
      setConvs(prev => prev.map(c => c.user_id === selectedUserId ? { ...c, unread: 0 } : c))
    }
  }, [selectedUserId, initialMessages])

  // Load older messages on scroll-up
  const handleScroll = useCallback(async () => {
    const el = scrollRef.current
    if (!el || !hasMore || loadingOlder || !selectedUserId) return
    if (el.scrollTop > 80) return // not near top yet

    const oldest = messages[0]
    if (!oldest) return

    setLoadingOlder(true)
    const prevHeight = el.scrollHeight

    try {
      const older: Message[] = await getChatMessages(selectedUserId, { before: oldest.createdAt }, accessToken)

      if (older.length === 0) {
        setHasMore(false)
        return
      }

      setMessages(prev => [...older, ...prev])
      if (older.length < 50) setHasMore(false)

      // Restore scroll position after prepend
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight
      })
    } catch {
      // silent — user can scroll again
    } finally {
      setLoadingOlder(false)
    }
  }, [hasMore, loadingOlder, selectedUserId, messages, accessToken])

  const selectConversation = (userId: string) => {
    startTransition(() => router.push(`/chat?userId=${userId}`))
  }

  const handleTextChange = (val: string) => {
    setText(val)
    if (selectedUserId && val.trim()) {
      socketRef.current?.emit("chat:typing", { userId: selectedUserId })
    }
  }

  const handleImagePick = () => fileInputRef.current?.click()
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    e.target.value = ""
  }
  const clearImage = () => { setImageFile(null); setImagePreview(null) }

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append("file", file)
    uploadAbortRef.current?.abort()
    uploadAbortRef.current = new AbortController()
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData, signal: uploadAbortRef.current.signal })
      const data = await res.json()
      return data.url || null
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return null
      return null
    }
  }, [])

  const sendMessage = async () => {
    if ((!text.trim() && !imageFile) || !selectedUserId || sending) return
    const trimmed = text.trim()
    setSending(true)
    setText("")

    let imageUrl: string | undefined
    if (imageFile) {
      imageUrl = (await uploadImage(imageFile)) || undefined
      clearImage()
      if (!imageUrl && !trimmed) { setSending(false); toast.error("Rasm yuklanmadi"); return }
    }

    const optimistic: Message = {
      _id: `opt-${Date.now()}`,
      user_id: selectedUserId,
      sender: "admin",
      text: trimmed,
      image_url: imageUrl || null,
      is_read: true,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    socketRef.current?.emit("chat:admin_send", { userId: selectedUserId, text: trimmed, imageUrl })
    setSending(false)
  }

  const ROLE_LABELS: Record<string, string> = { kuryer: "Kuryer", client: "Mijoz", admin: "Admin" }

  return (
    <div className="flex h-full rounded-xl border overflow-hidden bg-background">
      {/* Conversations list */}
      <div className="w-96 border-r flex flex-col shrink-0">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold text-sm">Muloqotlar</h2>
        </div>
        <ScrollArea className="flex-1">
          {convs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Muloqotlar yo&apos;q</div>
          ) : (
            convs.map(conv => (
              <button
                key={conv.user_id}
                onClick={() => selectConversation(conv.user_id)}
                className={`w-full flex items-start gap-3 px-4 py-3 border-b hover:bg-muted/30 text-left transition-colors ${
                  selectedUserId === conv.user_id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                }`}
              >
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                  {(conv.user_name || conv.user_phone || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium text-sm truncate">{conv.user_name || conv.user_phone}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{timeStr(conv.last_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="text-xs text-muted-foreground truncate">
                      {conv.last_sender === "admin" ? "Siz: " : ""}{conv.last_message}
                    </span>
                    {conv.unread > 0 && (
                      <Badge className="h-4 min-w-4 px-1 text-[10px] bg-primary shrink-0">{conv.unread}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {ROLE_LABELS[conv.user_role || ""] || conv.user_role}
                    </Badge>
                    {conv.is_closed && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">Yopilgan</Badge>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Chat thread */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedUserId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <MessageSquare className="h-12 w-12 mx-auto opacity-20" />
              <p className="text-sm">Muloqotni tanlang</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                {(selectedConv?.user_name || selectedConv?.user_phone || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{selectedConv?.user_name || selectedConv?.user_phone}</p>
                <p className="text-xs text-muted-foreground">
                  {typing ? (
                    <span className="text-primary animate-pulse">yozmoqda...</span>
                  ) : (
                    selectedConv?.user_phone
                  )}
                </p>
              </div>
              {!selectedConv?.is_closed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const res = await fetch(`${API_URL}/api/v1/chat/${selectedUserId}/close`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${accessToken}` },
                      })
                      if (!res.ok) throw new Error(`${res.status}`)
                      setConvs(prev => prev.map(c => c.user_id === selectedUserId ? { ...c, is_closed: true } : c))
                      toast.success("Chat yopildi")
                      startTransition(() => router.refresh())
                    } catch { toast.error("Xatolik") }
                  }}
                >
                  Chatni yopish
                </Button>
              )}
            </div>

            {/* Active order panel */}
            {selectedConv?.order && !selectedConv.is_closed && !["delivered", "cancelled"].includes(selectedConv.order.status) && (
              <div className="px-5 py-2 border-b bg-muted/40 flex items-center gap-2 text-xs flex-wrap">
                <Badge variant="secondary" className="font-mono">{selectedConv.order.order_number}</Badge>
                {selectedConv.order.restaurant_name && (
                  <span className="font-medium truncate max-w-[140px]">{selectedConv.order.restaurant_name}</span>
                )}
                <Badge>{ORDER_STATUS_LABELS[selectedConv.order.status] ?? selectedConv.order.status}</Badge>
                <span className="ml-auto font-semibold whitespace-nowrap">
                  {(selectedConv.order.total ?? 0).toLocaleString()} so&apos;m
                </span>
                <a
                  href={`/orders/${selectedConv.order._id}`}
                  className="text-primary underline underline-offset-2 whitespace-nowrap"
                >
                  Ochish
                </a>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-hidden">
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="h-full overflow-y-auto px-5 py-4"
              >
                {/* Loading older indicator */}
                {loadingOlder && (
                  <div className="flex justify-center py-2 mb-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!hasMore && messages.length > 0 && (
                  <p className="text-center text-xs text-muted-foreground py-2 mb-2">
                    Chat boshlanishi
                  </p>
                )}

                <div className="space-y-3">
                  {messages.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">Xabarlar yo&apos;q</p>
                  )}
                  {messages.map((msg) => (
                    <div key={msg._id} className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 space-y-1 ${
                        msg.sender === "admin"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted rounded-bl-sm"
                      }`}>
                        {msg.image_url && (
                          <img
                            src={`${API_URL}${msg.image_url}`}
                            alt="Rasm"
                            className="rounded-lg max-w-full max-h-48 object-cover cursor-pointer"
                            onClick={() => window.open(`${API_URL}${msg.image_url}`, "_blank")}
                          />
                        )}
                        {msg.text && <p className="text-sm">{msg.text}</p>}
                        <p className={`text-[10px] ${msg.sender === "admin" ? "text-primary-foreground/60" : "text-muted-foreground"} text-right`}>
                          {timeStr(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
              </div>
            </div>

            {/* Image preview */}
            {imagePreview && (
              <div className="px-5 py-2 border-t flex items-center gap-2">
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="h-16 rounded-lg object-cover" />
                  <button onClick={clearImage} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="px-5 py-3 border-t flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <Button size="icon" variant="ghost" className="shrink-0" onClick={handleImagePick} title="Rasm yuborish">
                <ImagePlus className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Xabar yozing..."
                value={text}
                onChange={e => handleTextChange(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                className="flex-1"
              />
              <Button size="sm" disabled={(!text.trim() && !imageFile) || sending} onClick={sendMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
