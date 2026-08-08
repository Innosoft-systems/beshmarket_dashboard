import { DEFAULT_ORDER_SOUND_URL, fetchOrderSoundUrl } from "./order-sound"

const STOP_AFTER_MS = 60_000

/**
 * A single shared alarm for the restaurant panel.
 *
 * Two independent websocket events announce the same order — `order.new` from
 * useRestaurantSocket and `restaurant.notification` from the bell — and either
 * one may fail to arrive. Both trigger this module so the alarm survives losing
 * one of them, and `playOrderAlarm` is a no-op while already ringing so the
 * common case (both arrive) does not restart the sound.
 */
let audio: HTMLAudioElement | null = null
let loadedUrl: string | null = null
let stopTimer: ReturnType<typeof setTimeout> | null = null
let urlPromise: Promise<string> | null = null

function swapSource(url: string): void {
  if (!audio || url === loadedUrl) return
  const wasPlaying = !audio.paused
  audio.pause()
  const next = new Audio(url)
  next.loop = true
  audio = next
  loadedUrl = url
  if (wasPlaying) next.play().catch(() => {})
}

/** Creates the audio element and resolves the configured sound once per session. */
export function prewarmOrderAlarm(): void {
  if (typeof window === "undefined") return

  if (!audio) {
    audio = new Audio(DEFAULT_ORDER_SOUND_URL)
    audio.loop = true
    loadedUrl = DEFAULT_ORDER_SOUND_URL
  }

  if (!urlPromise) {
    urlPromise = fetchOrderSoundUrl()
    urlPromise.then(swapSource).catch(() => {})
  }
}

export function playOrderAlarm(): void {
  if (typeof window === "undefined") return

  prewarmOrderAlarm()
  const el = audio
  if (!el || !el.paused) return

  el.currentTime = 0
  el.play().catch(() => {})

  if (stopTimer) clearTimeout(stopTimer)
  stopTimer = setTimeout(stopOrderAlarm, STOP_AFTER_MS)
}

export function stopOrderAlarm(): void {
  if (audio) {
    audio.pause()
    audio.currentTime = 0
  }
  if (stopTimer) {
    clearTimeout(stopTimer)
    stopTimer = null
  }
}
