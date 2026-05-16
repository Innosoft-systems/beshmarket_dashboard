import { Metadata } from "next"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { ChatClient } from "@/components/chat/ChatClient"

export const metadata: Metadata = { title: "Chat | BeshMarket" }

interface Props {
  searchParams: Promise<{ userId?: string }>
}

export default async function ChatPage({ searchParams }: Props) {
  const sp = await searchParams
  const selectedUserId = sp.userId || ""
  const token = await getAccessToken()

  const [convRes, messagesRes] = await Promise.all([
    apiRequest<any>("/chat/conversations", { accessToken: token }).catch(() => ({ data: [] })),
    selectedUserId
      ? apiRequest<any>(`/chat/${selectedUserId}/messages`, { accessToken: token }).catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] }),
  ])

  const conversations = Array.isArray(convRes.data) ? convRes.data : []
  const messages = Array.isArray(messagesRes.data) ? messagesRes.data : []

  return (
    <div className="h-[calc(100vh-8rem)]">
      <ChatClient
        conversations={conversations}
        initialMessages={messages}
        selectedUserId={selectedUserId}
        accessToken={token || ""}
      />
    </div>
  )
}
