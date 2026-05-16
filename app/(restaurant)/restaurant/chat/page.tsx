import { getRmAccessToken } from '@/lib/auth/restaurant-session'
import { apiRequest } from '@/lib/api/client'
import { RestaurantChatClient } from '@/components/restaurant/ChatClient'

export default async function ChatPage() {
  const token = await getRmAccessToken()

  const meRes = await apiRequest<any>('/auth/me', { accessToken: token }).catch(() => null)
  const userId = meRes?.data?._id ?? ''

  const msgsRes = await apiRequest<any>('/chat/my-messages', { accessToken: token }).catch(() => ({ data: [] }))
  const messages = msgsRes.data?.data || msgsRes.data || []

  return <RestaurantChatClient messages={messages} accessToken={token ?? ''} userId={userId} />
}
