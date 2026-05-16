import { getMyRestaurant } from '@/lib/api/restaurant-cache'
import { rmApiRequest } from '@/lib/api/restaurant-client'
import { RestaurantChatClient } from '@/components/restaurant/ChatClient'

export default async function ChatPage() {
  const { token } = await getMyRestaurant()

  const meRes = await rmApiRequest<any>('/auth/me', { accessToken: token }).catch(() => null)
  const userId = meRes?.data?._id ?? ''

  const msgsRes = await rmApiRequest<any>('/chat/my-messages', { accessToken: token }).catch(() => ({ data: [] }))
  const messages = msgsRes.data?.data || msgsRes.data || []

  return <RestaurantChatClient messages={messages} accessToken={token} userId={userId} />
}