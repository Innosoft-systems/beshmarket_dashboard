"use client"

import { useState, useEffect, useRef, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { io, Socket } from "socket.io-client"
import { Send, MessageSquare, ImagePlus, Zap, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

interface Message {
  _id: string
  user_id: string
  sender: "user" | "admin"
  text: string
  image_url?: string | null
  order_id?: string | null
  is_read: boolean
  createdAt: string
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
}

interface QuickReply {
  _id: string
  title: string
  text: string
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
  const [typing, setTyping] = useState(false) // user is typing
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedUserIdRef = useRef(selectedUserId)
  const selectedConv = convs.find(c => c.user_id === selectedUserId)

  useEffect(() => { selectedUserIdRef.current = selectedUserId }, [selectedUserId])

  // Load quick replies
  useEffect(() => {
    if (!accessToken) return
    fetch(`${API_URL}/api/v1/chat/quick-replies`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setQuickReplies(data) })
      .catch(() => {})
  }, [accessToken])

  // Socket
  useEffect(() => {
    if (!accessToken) return
    const socket = io(`${API_URL}/chat`, {
      auth: { token: accessToken },
      transports: ["websocket"],
    })
    socketRef.current = socket

    socket.on("chat:message", (msg: Message) => {
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
        // Clear typing when message arrives
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
        }
        return newConvs.sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())
      })
    })

    socket.on("chat:typing", (data: { userId?: string; sender?: string }) => {
      if (data.sender === "user" && data.userId === selectedUserIdRef.current) {
        setTyping(true)
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => setTyping(false), 3000)
      }
    })

    socket.on("chat:closed", ({ userId }: { userId?: string }) => {
      if (userId) {
        setConvs(prev => prev.map(c => c.user_id === userId ? { ...c, is_closed: true } : c))
      }
    })

    socket.on("chat:read", ({ userId }: { userId: string }) => {
      setConvs(prev => prev.map(c => c.user_id === userId ? { ...c, unread: 0 } : c))
    })

    return () => { socket.disconnect() }
  }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // On conversation select
  useEffect(() => {
    setMessages(initialMessages)
    setTyping(false)
    if (selectedUserId) {
      socketRef.current?.emit("chat:read", { userId: selectedUserId })
      setConvs(prev => prev.map(c => c.user_id === selectedUserId ? { ...c, unread: 0 } : c))
    }
  }, [selectedUserId, initialMessages])

  const selectConversation = (userId: string) => {
    startTransition(() => router.push(`/chat?userId=${userId}`))
  }

  // Emit typing
  const handleTextChange = (val: string) => {
    setText(val)
    if (selectedUserId && val.trim()) {
      socketRef.current?.emit("chat:typing", { userId: selectedUserId })
    }
  }

  // Image pick
  const handleImagePick = () => fileInputRef.current?.click()
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    e.target.value = ""
  }
  const clearImage = () => { setImageFile(null); setImagePreview(null) }

  // Upload image
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()
      return data.url || null
    } catch { return null }
  }, [])

  // Send message
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

  // Quick reply select
  const handleQuickReply = (qr: QuickReply) => {
    setText(qr.text)
    setShowQuickReplies(false)
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
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full px-5 py-4">
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
              </ScrollArea>
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

            {/* Quick replies */}
            {showQuickReplies && quickReplies.length > 0 && (
              <div className="px-5 py-2 border-t flex flex-wrap gap-1.5">
                {quickReplies.map(qr => (
                  <button
                    key={qr._id}
                    onClick={() => handleQuickReply(qr)}
                    className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  >
                    {qr.title}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-5 py-3 border-t flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <Button size="icon" variant="ghost" className="shrink-0" onClick={handleImagePick} title="Rasm yuborish">
                <ImagePlus className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className={`shrink-0 ${showQuickReplies ? "text-primary" : ""}`}
                onClick={() => setShowQuickReplies(!showQuickReplies)}
                title="Tezkor javoblar"
              >
                <Zap className="h-4 w-4" />
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
