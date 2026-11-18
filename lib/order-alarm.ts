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

// ── Can the alarm actually sound? ───────────────────────────────────────────
//
// A panel reopened after the browser was closed has had no user gesture yet,
// and Chrome rejects an audible `play()` until it gets one. The alarm used to
// swallow that (a console warning), so the venue simply heard nothing. The
// state below lets the panel show a visible "Ovozni yoqish" button instead.

/** "unknown" until checked; "blocked" means a click is needed before it can sound. */
export type OrderAlarmSoundState = "unknown" | "ready" | "blocked"

let soundState: OrderAlarmSoundState = "unknown"
const soundListeners = new Set<() => void>()
/** An order that should have rung while sound was blocked; rung on unlock. */
let pendingRing: { orderId?: string; options: AlarmOptions; at: number } | null = null
const PENDING_RING_MAX_AGE_MS = STOP_AFTER_MS
let probeStarted = false

function setSoundState(next: OrderAlarmSoundState): void {
  if (soundState === next) return
  soundState = next
  soundListeners.forEach((l) => l())
}

export function getOrderAlarmSoundState(): OrderAlarmSoundState {
  return soundState
}

export function subscribeOrderAlarmSoundState(listener: () => void): () => void {
  soundListeners.add(listener)
  return () => {
    soundListeners.delete(listener)
  }
}

const isAutoplayRefusal = (err: unknown) => (err as { name?: string } | null)?.name === "NotAllowedError"

/**
 * Finds out on load whether the page may play sound, with a silent probe on a
 * separate element (volume 0 but not muted counts as audible for the autoplay
 * policy, which is decided per page, so the result holds for the alarm too).
 */
function probeAutoplay(): void {
  if (probeStarted) return
  probeStarted = true
  let probe: HTMLAudioElement
  try {
    probe = new Audio(loadedUrl ?? DEFAULT_ORDER_SOUND_URL)
    probe.volume = 0
  } catch {
    return
  }
  let attempt: Promise<void> | undefined
  try {
    attempt = probe.play()
  } catch (err) {
    if (isAutoplayRefusal(err)) setSoundState("blocked")
    return
  }
  // Very old browsers return undefined from play(); nothing to learn there.
  attempt
    ?.then(() => {
      probe.pause()
      setSoundState("ready")
    })
    .catch((err) => {
      if (isAutoplayRefusal(err)) setSoundState("blocked")
    })
}

function ringPendingIfRecent(): void {
  const ring = pendingRing
  pendingRing = null
  if (ring && Date.now() - ring.at < PENDING_RING_MAX_AGE_MS) {
    lastOrderId = null
    playOrderAlarm(ring.orderId, ring.options)
  }
}

/**
 * Unlocks sound from a click (the "Ovozni yoqish" button): plays the alarm
 * element muted for a moment, which marks the page as allowed to play, then
 * rings an order that arrived while sound was blocked. Resolves whether sound
 * is now allowed.
 */
export async function unlockOrderAlarm(): Promise<boolean> {
  if (typeof window === "undefined") return false
  prewarmOrderAlarm()
  const el = audio
  if (!el) return false
  if (!el.paused) {
    setSoundState("ready")
    return true
  }
  el.muted = true
  try {
    await el.play()
    if (stopTimer === null) {
      el.pause()
      el.currentTime = 0
    }
    setSoundState("ready")
  } catch {
    return false
  } finally {
    el.muted = false
  }
  ringPendingIfRecent()
  return true
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
        el.muted = false
        setSoundState("ready")
        ringPendingIfRecent()
      })
      .catch(() => {
        el.muted = false
      })
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
  probeAutoplay()

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
  el.play()
    .then(() => setSoundState("ready"))
    .catch((err) => {
      console.warn("[order-alarm] playback blocked:", err)
      if (!isAutoplayRefusal(err)) return
      // Keep it: the "Ovozni yoqish" click rings it, so this order is not lost.
      pendingRing = { orderId, options, at: Date.now() }
      setSoundState("blocked")
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
