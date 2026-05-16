'use client'
import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { Send, MessageSquare, Headphones } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Message { _id: string; user_id: string; sender: 'user' | 'admin'; text: string; is_read: boolean; createdAt: string }

function timeStr(iso: string) {
  const d = new Date(iso), now = new Date()
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('uz', { day: 'numeric', month: 'short' })
}

export function RestaurantChatClient({ messages: init, accessToken, userId }: { messages: Message[]; accessToken: string; userId: string }) {
  const [messages, setMessages] = useState(init)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMessages(init) }, [init])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (!accessToken) return
    const socket = io(`${API_URL}/chat`, { auth: { token: accessToken }, transports: ['websocket'] })
    socketRef.current = socket
    socket.on('chat:message', (msg: Message) => {
      if (msg.user_id === userId || msg.sender === 'admin') setMessages(prev => [...prev, msg])
    })
    return () => { socket.disconnect() }
  }, [accessToken, userId])

  const sendMessage = () => {
    if (!text.trim() || sending) return
    setSending(true)
    socketRef.current?.emit('chat:send', { text: text.trim() })
    setText('')
    setSending(false)
  }

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-8rem)]">
      <Card>
        <CardContent className="py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Headphones className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">BeshMarket qo'llab-quvvatlash</p>
            <p className="text-xs text-muted-foreground">Admin bilan to'g'ridan muloqot</p>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 overflow-hidden">
        <CardContent className="h-full overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <MessageSquare className="h-10 w-10 opacity-30" />
              <p className="text-sm">Hali xabar yo'q</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg._id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'admin' && (
                <Avatar className="h-7 w-7 mr-2 mt-0.5 shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">A</AvatarFallback>
                </Avatar>
              )}
              <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 space-y-1 ${
                msg.sender === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'
              }`}>
                {msg.sender === 'admin' && <p className="text-xs font-medium text-primary">Admin</p>}
                <p className="text-sm">{msg.text}</p>
                <p className={`text-[10px] text-right ${msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {timeStr(msg.createdAt)}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-3 flex gap-2">
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Xabar yozing..."
            className="border-0 shadow-none focus-visible:ring-0"
          />
          <Button onClick={sendMessage} disabled={!text.trim() || sending} size="sm">
            <Send className="h-4 w-4" /> Yuborish
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
