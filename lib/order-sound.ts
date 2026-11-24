const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export const DEFAULT_ORDER_SOUND_URL = "/sounds/sound.mp3"

export function resolveOrderSoundUrl(path?: string | null): string {
  if (!path) return DEFAULT_ORDER_SOUND_URL
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  if (path.startsWith("/uploads/")) return `${API_URL}${path}`
  return path.startsWith("/") ? path : `/${path}`
}

/**
 * The configured order sound, or `null` when it could not be determined — so the
 * caller can keep the sound it already has and ask again later, instead of
 * mistaking a network failure for "the default sound is configured".
 */
export async function fetchOrderSoundUrl(): Promise<string | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/settings/order-notification-sound`, {
      cache: "no-store",
      signal: AbortSignal.timeout?.(10_000),
    })
    if (!response.ok) return null
    const json = await response.json()
    const data = json?.data ?? json
    return resolveOrderSoundUrl(data?.url)
  } catch {
    return null
  }
}
