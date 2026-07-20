const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export const DEFAULT_ORDER_SOUND_URL = "/sounds/sound.mp3"

export function resolveOrderSoundUrl(path?: string | null): string {
  if (!path) return DEFAULT_ORDER_SOUND_URL
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  if (path.startsWith("/uploads/")) return `${API_URL}${path}`
  return path.startsWith("/") ? path : `/${path}`
}

export async function fetchOrderSoundUrl(): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/api/v1/settings/order-notification-sound`, {
      cache: "no-store",
    })
    if (!response.ok) return DEFAULT_ORDER_SOUND_URL
    const json = await response.json()
    const data = json?.data ?? json
    return resolveOrderSoundUrl(data?.url)
  } catch {
    return DEFAULT_ORDER_SOUND_URL
  }
}
