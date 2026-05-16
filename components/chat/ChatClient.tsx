"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { io, Socket } from "socket.io-client"
import { Send, MessageSquare } from "lucide-react"
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
  const socketRef = useRef<Socket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const selectedConv = convs.find(c => c.user_id === selectedUserId)

  // Socket
  useEffect(() => {
    if (!accessToken) return
    const socket = io(`${API_URL}/chat`, {
      auth: { token: accessToken },
      transports: ["websocket"],
    })
    socketRef.current = socket

    socket.on("chat:message", (msg: Message) => {
      // Agar joriy konversatsiya bo'lsa — xabarlar listiga qo'sh
      if (msg.user_id === selectedUserId) {
        setMessages(prev => [...prev, msg])
      }
      // Konversatsiyalar listini yangilash
      setConvs(prev => {
        const idx = prev.findIndex(c => c.user_id === msg.user_id)
        const updated = { last_message: msg.text, last_sender: msg.sender, last_at: msg.createdAt }
        if (idx === -1) {
          startTransition(() => router.refresh()) // yangi user — full refresh
          return prev
        }
        const newConvs = [...prev]
        newConvs[idx] = {
          ...newConvs[idx],
          ...updated,
          unread: msg.sender === "user" && msg.user_id !== selectedUserId
            ? (newConvs[idx].unread || 0) + 1
            : newConvs[idx].unread,
        }
        return newConvs.sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())
      })
    })

    socket.on("chat:read", ({ userId }: { userId: string }) => {
      setConvs(prev => prev.map(c => c.user_id === userId ? { ...c, unread: 0 } : c))
    })

    return () => { socket.disconnect() }
  }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // Yangi xabar kelganda scroll pastga
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Konversatsiya tanlaganda
  useEffect(() => {
    setMessages(initialMessages)
    // O'qilgan deb belgilaymiz
    if (selectedUserId) {
      socketRef.current?.emit("chat:read", { userId: selectedUserId })
      setConvs(prev => prev.map(c => c.user_id === selectedUserId ? { ...c, unread: 0 } : c))
    }
  }, [selectedUserId, initialMessages])

  const selectConversation = (userId: string) => {
    startTransition(() => router.push(`/chat?userId=${userId}`))
  }

  const sendMessage = async () => {
    if (!text.trim() || !selectedUserId || sending) return
    setSending(true)
    socketRef.current?.emit("chat:admin_send", { userId: selectedUserId, text: text.trim() })
    setText("")
    setSending(false)
  }

  const ROLE_LABELS: Record<string, string> = { kuryer: "Kuryer", client: "Mijoz", admin: "Admin" }

  return (
    <div className="flex h-full rounded-xl border overflow-hidden bg-background">
      {/* Conversations list */}
      <div className="w-80 border-r flex flex-col shrink-0">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold text-sm">Muloqotlar</h2>
        </div>
        <ScrollArea className="flex-1">
          {convs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Muloqotlar yo'q</div>
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
                  <Badge variant="outline" className="text-[10px] px-1 py-0 mt-0.5">
                    {ROLE_LABELS[conv.user_role || ""] || conv.user_role}
                  </Badge>
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
              <div>
                <p className="font-medium text-sm">{selectedConv?.user_name || selectedConv?.user_phone}</p>
                <p className="text-xs text-muted-foreground">{selectedConv?.user_phone}</p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-5 py-4">
              <div className="space-y-3">
                {messages.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">Xabarlar yo'q</p>
                )}
                {messages.map((msg) => (
                  <div key={msg._id} className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 space-y-1 ${
                      msg.sender === "admin"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    }`}>
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-[10px] ${msg.sender === "admin" ? "text-primary-foreground/60" : "text-muted-foreground"} text-right`}>
                        {timeStr(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="px-5 py-3 border-t flex gap-2">
              <Input
                placeholder="Xabar yozing..."
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                className="flex-1"
              />
              <Button size="sm" disabled={!text.trim() || sending} onClick={sendMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
