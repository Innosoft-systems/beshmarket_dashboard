import { DEFAULT_ORDER_SOUND_URL, fetchOrderSoundUrl } from "./order-sound"

const STOP_AFTER_MS = 60_000
/** Window in which the same order id is treated as a duplicate announcement. */
const DEDUPE_MS = 5_000
/** How long a resolved sound url stays trusted before it is re-fetched. */
const URL_TTL_MS = 15 * 60 * 1000

/**
 * A single shared alarm for the order panels.
 *
 * Two independent websocket events announce the same order — `order.new` from
 * the socket hooks and `restaurant.notification` from the bell — and either one
 * may fail to arrive. Both trigger this module so the alarm survives losing one
 * of them; duplicates are suppressed by order id, so a genuinely new order still
 * restarts the sound (and its stop timer) even while an earlier one is ringing.
 */
let audio: HTMLAudioElement | null = null
let loadedUrl: string | null = null
let stopTimer: ReturnType<typeof setTimeout> | null = null
let urlPromise: Promise<string> | null = null
let urlResolvedAt = 0
let lastOrderId: string | null = null
let lastPlayedAt = 0

interface AlarmOptions {
  /** Ring continuously until stopped or the stop timer fires. Default true. */
  loop?: boolean
}

function swapSource(url: string): void {
  urlResolvedAt = Date.now()
  if (!audio || url === loadedUrl) return

  const wasPlaying = !audio.paused
  const wasLooping = audio.loop
  audio.pause()

  const next = new Audio(url)
  next.loop = wasLooping
  audio = next
  loadedUrl = url
  if (wasPlaying) next.play().catch(() => {})
}

let unlockRegistered = false

/**
 * Browsers reject `play()` until the user has interacted with the page, so a
 * freshly loaded panel would stay silent for its first orders. On the first
 * gesture, play the element muted and pause it again: that marks it as
 * user-activated for every later programmatic `play()`.
 */
function registerAutoplayUnlock(): void {
  if (unlockRegistered || typeof window === "undefined") return
  unlockRegistered = true

  const events = ["pointerdown", "keydown", "touchstart"] as const
  const unlock = () => {
    events.forEach((e) => window.removeEventListener(e, unlock))
    const el = audio
    if (!el || !el.paused) return
    el.muted = true
    el.play()
      .then(() => {
        // Leave a real alarm alone if one started in the meantime.
        if (stopTimer === null) {
          el.pause()
          el.currentTime = 0
        }
      })
      .catch(() => {})
      .finally(() => { el.muted = false })
  }
  events.forEach((e) => window.addEventListener(e, unlock, { passive: true }))
}

/**
 * Creates the audio element and resolves the configured sound.
 * Re-fetches once the cached url goes stale, so a transient failure at page load
 * does not pin the session to the default sound and an admin's change is picked
 * up without a reload.
 */
export function prewarmOrderAlarm(): void {
  if (typeof window === "undefined") return

  if (!audio) {
    audio = new Audio(DEFAULT_ORDER_SOUND_URL)
    audio.loop = true
    loadedUrl = DEFAULT_ORDER_SOUND_URL
  }
  registerAutoplayUnlock()

  const isStale = Date.now() - urlResolvedAt > URL_TTL_MS
  if (urlPromise && !isStale) return

  urlPromise = fetchOrderSoundUrl()
  urlPromise.then(swapSource).catch(() => {})
}

export function playOrderAlarm(orderId?: string, options: AlarmOptions = {}): void {
  if (typeof window === "undefined") return

  prewarmOrderAlarm()
  const el = audio
  if (!el) return

  // Suppress only the second announcement of the same order — never a new one.
  const now = Date.now()
  if (orderId && orderId === lastOrderId && now - lastPlayedAt < DEDUPE_MS) return
  lastOrderId = orderId ?? null
  lastPlayedAt = now

  el.loop = options.loop ?? true
  el.currentTime = 0
  el.play().catch((err) => {
    console.warn("[order-alarm] playback blocked:", err)
  })

  if (stopTimer) clearTimeout(stopTimer)
  stopTimer = el.loop ? setTimeout(stopOrderAlarm, STOP_AFTER_MS) : null
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
