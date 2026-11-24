import { DEFAULT_ORDER_SOUND_URL, fetchOrderSoundUrl } from "./order-sound"

/** Longest one order may ring. */
const RING_MS = 60_000
/**
 * How long an order that could not ring keeps waiting for sound. The server
 * cancels an unanswered order after 2 minutes and says so on the socket; this
 * only bounds the wait when that message is lost.
 */
const WAITING_MS = 5 * 60_000
/** An order that has waited this long for sound must not go unnoticed. */
const WARN_AFTER_MS = 2_000
/** How often the sound is tried again while an order waits for it. */
const RETRY_MS = 4_000
/** Window in which the same order id is treated as a duplicate announcement. */
const DEDUPE_MS = 5_000
/** How long a resolved sound url stays trusted before it is re-fetched. */
const URL_TTL_MS = 15 * 60 * 1000
/** A sound that has not started by now is treated as unplayable. */
const START_TIMEOUT_MS = 5_000
/** Started playback whose position has not moved by now is not really playing. */
const VERIFY_MS = 3_000
/** How long the silent probe may stay undecided before the panel warns anyway. */
const PROBE_TIMEOUT_MS = 2_000
/** Order ids remembered for de-duplication. */
const MEMORY_LIMIT = 500
const DONE_STORAGE_KEY = "bm_order_alarm_done"

/** 0.1 s of silence (8 kHz mono WAV). */
const SILENCE =
  "data:audio/wav;base64,UklGRkYDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSIDAACA" +
  "gICA".repeat(267)

/**
 * Marks a control that plays the sound itself, so the unlock below leaves its
 * gestures alone: unlocking silently first would remove the banner's button
 * between keydown and the click that should have made it audible.
 */
export const ORDER_SOUND_CONTROL = "data-order-sound-control"

/**
 * checking — the first silent probe has not answered yet
 * unknown  — sound may or may not work, nothing says so for certain
 * blocked  — the browser refused to play (autoplay policy), a gesture is needed
 * failed   — neither the configured nor the default file could be played
 * enabled  — unmuted playback has actually run in this page
 */
export type OrderSoundStatus = "checking" | "unknown" | "blocked" | "failed" | "enabled"

export interface OrderSoundState {
  status: OrderSoundStatus
  /** An order is ringing right now. */
  ringing: boolean
  /** An order should be ringing but is not audible (yet). */
  waiting: boolean
  /** The test sound is playing. */
  testing: boolean
  /** Refused even for a press of our own button: only a browser setting can help. */
  needsPermission: boolean
}

export type PlayResult = "ok" | "fallback" | "blocked" | "failed" | "aborted"

type Mode = "idle" | "unlock" | "chime" | "alarm" | "test"

interface AlarmOptions {
  /** Repeat until the order is handled, at most 60 s. Default true. */
  loop?: boolean
  /** Never ring past this moment (the order's accept deadline). */
  until?: number
}

interface Ring {
  /** When it stops waiting for sound. */
  expires: number
  /** Hard end, audible or not. */
  until: number
  /** What is left of its 60 s. */
  budget: number
  /** While audible: when its time is up. `null` while it waits for sound. */
  endsAt: number | null
}

/**
 * A single shared alarm for the order panels.
 *
 * Two independent websocket events announce the same order — `order.new` from
 * the socket hooks and `restaurant.notification` from the bell — and either one
 * may fail to arrive. Both trigger this module so the alarm survives losing one
 * of them; duplicates are suppressed by order id, so a genuinely new order still
 * restarts the sound even while an earlier one is ringing. Each order rings until
 * it is handled or its own 60 s are up, so handling one does not silence another.
 *
 * There is exactly one <audio> element for the life of the page and only its
 * `src` changes: WebKit (every browser on an iPad) grants playback permission per
 * element, so a fresh element would be locked again. An <audio> element rather
 * than WebAudio because iOS mutes WebAudio with the silent switch, and because it
 * plays the cross-origin upload without depending on CORS.
 *
 * While an order is due to ring but nothing is heard — refused, stalled, broken
 * file, paused from outside — it stays in `rings` unstarted: the sound is retried
 * every few seconds and by every gesture, and after 2 s the panel says so.
 */
let audio: HTMLAudioElement | null = null
let loadedUrl: string | null = null
/** What the settings say; `targetUrl` is what we play (default if that file is broken). */
let configuredUrl = DEFAULT_ORDER_SOUND_URL
let targetUrl = DEFAULT_ORDER_SOUND_URL
let urlFetch: Promise<void> | null = null
let urlResolvedAt = 0

/** Set before every pause() of ours, which is how a foreign pause is told apart. */
let mode: Mode = "idle"
/** Id of the latest `play()` call, and of the latest one that succeeded. */
let attempt = 0
let lastGoodAttempt = 0
/** Running while a `play()` has not settled. */
let startTimer: ReturnType<typeof setTimeout> | null = null
/** A resolved `play()` that has yet to be seen moving. */
let verifying: { from: number; since: number; timer: ReturnType<typeof setTimeout> } | null = null
/** The caller waiting for the outcome of the current playback. */
let settleResult: ((result: PlayResult) => void) | null = null
let currentResult: Promise<PlayResult> | null = null
/** The current download never got going; the next start has to load it anew. */
let stalled = false
/** A real sound did not play when it should have; only a real one clears this. */
let suspect = false

const rings = new Map<string, Ring>()
let ringTimer: ReturnType<typeof setTimeout> | null = null
let warnTimer: ReturnType<typeof setTimeout> | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null
const announcedAt = new Map<string, number>()
/** Orders that must not ring again: handled, silenced, or rung out. */
let done: Set<string> | null = null
let doneDirty = false

// ── State for the UI ─────────────────────────────────────────────────────────

const INITIAL_STATE: OrderSoundState = {
  status: "checking",
  ringing: false,
  waiting: false,
  testing: false,
  needsPermission: false,
}
let status: OrderSoundStatus = "checking"
let needsPermission = false
let state = INITIAL_STATE
const listeners = new Set<() => void>()

function emit(): void {
  watchWaiting()
  const all = [...rings.values()]
  const next: OrderSoundState = {
    status,
    ringing: mode === "alarm" && all.some((r) => r.endsAt !== null),
    waiting: all.some((r) => r.endsAt === null),
    testing: mode === "test",
    needsPermission: status === "blocked" && needsPermission,
  }
  const changed = (Object.keys(next) as (keyof OrderSoundState)[]).some((k) => next[k] !== state[k])
  if (!changed) return
  state = next
  listeners.forEach((listener) => listener())
}

export function subscribeOrderSound(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function getOrderSoundState(): OrderSoundState {
  return state
}

export function getInitialOrderSoundState(): OrderSoundState {
  return INITIAL_STATE
}

// ── Playback ─────────────────────────────────────────────────────────────────

function ensureAudio(): HTMLAudioElement {
  if (audio) return audio
  const el = new Audio()
  el.preload = "auto"
  el.addEventListener("error", onElementError)
  el.addEventListener("timeupdate", onElementProgress)
  el.addEventListener("ended", onElementEnded)
  el.addEventListener("pause", onElementPause)
  audio = el
  return el
}

function loadUrl(url: string): void {
  const el = ensureAudio()
  if (loadedUrl === url && !el.error && !stalled) return
  loadedUrl = url
  stalled = false
  el.loop = false
  el.src = url
}

/** `mode` must have been changed first, or this looks like a foreign pause. */
function pauseAndRewind(): void {
  if (!audio) return
  if (!audio.paused) audio.pause()
  if (audio.currentTime > 0) audio.currentTime = 0
}

function clearStartTimer(): void {
  if (startTimer) clearTimeout(startTimer)
  startTimer = null
}

function clearVerification(): void {
  if (verifying) clearTimeout(verifying.timer)
  verifying = null
}

function settle(result: PlayResult): void {
  const resolve = settleResult
  settleResult = null
  currentResult = null
  resolve?.(result)
}

/**
 * Must stay synchronous up to `play()`: WebKit only accepts a call made inside
 * the gesture's own event handler.
 */
function start(
  next: Exclude<Mode, "idle">,
  { rewind = true, carry = false }: { rewind?: boolean; carry?: boolean } = {},
): Promise<PlayResult> {
  const el = ensureAudio()
  const url = next === "unlock" ? SILENCE : targetUrl
  const reload = loadedUrl !== url || Boolean(el.error) || stalled
  // Another gesture on a start that is still pending must not extend its timeout.
  const samePendingStart = startTimer !== null && mode === next && !reload

  mode = next
  if (next === "alarm" && (reload || el.paused)) unstartRings()
  loadUrl(url)
  el.loop = next === "alarm"
  if (!reload && rewind && el.currentTime > 0) el.currentTime = 0

  const id = ++attempt
  clearVerification()
  if (!samePendingStart) {
    clearStartTimer()
    startTimer = setTimeout(onStartTimeout, next === "unlock" ? PROBE_TIMEOUT_MS : START_TIMEOUT_MS)
  }
  if (!carry) settle("aborted")
  currentResult ??= new Promise<PlayResult>((resolve) => { settleResult = resolve })
  const result = currentResult
  emit()

  el.play().then(
    () => onStarted(id),
    (err: unknown) => onRejected(id, url, next, err),
  )
  return result
}

/**
 * `play()` resolving is not proof: WebKit on the iPad resolves it and then sits at
 * position 0 when the element's only gesture so far was a touch-down. Sound counts
 * as working once the position has actually moved.
 */
function onStarted(id: number): void {
  lastGoodAttempt = Math.max(lastGoodAttempt, id)
  if (id !== attempt || !audio) return
  clearStartTimer()
  verifying = { from: audio.currentTime, since: Date.now(), timer: setTimeout(onStuck, VERIFY_MS) }
}

function onElementProgress(): void {
  if (verifying && audio && Math.abs(audio.currentTime - verifying.from) > 0.02) onPlaying()
}

function onPlaying(): void {
  const since = verifying?.since ?? Date.now()
  clearVerification()
  if (mode === "unlock") {
    // Silence playing is proof of permission, but not that the real files work.
    if (!suspect) {
      status = "enabled"
      disarm()
    } else if (status === "blocked") {
      status = "unknown"
    }
    mode = "idle"
    audio?.pause()
    loadUrl(targetUrl)
  } else {
    suspect = false
    needsPermission = false
    status = "enabled"
    disarm()
    if (mode === "alarm") {
      rings.forEach((ring) => {
        if (ring.endsAt === null) ring.endsAt = Math.min(since + ring.budget, ring.until)
      })
      scheduleRingTimer()
    }
  }
  settle(targetUrl === configuredUrl ? "ok" : "fallback")
  emit()
}

/** Back to nothing audible; orders that were ringing wait for sound again. */
function toSilence(result: PlayResult): void {
  mode = "idle"
  attempt++
  clearStartTimer()
  clearVerification()
  unstartRings()
  pauseAndRewind()
  settle(result)
}

function onStuck(): void {
  console.warn("[order-alarm] playback started but does not advance:", loadedUrl)
  if (mode === "unlock") {
    if (status === "checking") status = "unknown"
  } else {
    suspect = true
    status = "unknown"
  }
  toSilence("failed")
  arm()
  emit()
}

function onRejected(id: number, url: string, kind: Mode, err: unknown): void {
  const name = (err as { name?: string } | null)?.name

  if (name === "AbortError") {
    // Normally our own pause() or src change, which a newer attempt stands for.
    if (id === attempt) onInterrupted()
    return
  }

  if (name === "NotAllowedError") {
    // Several attempts overlap during one tap; a refusal of an early one says
    // nothing once a later one has been accepted.
    if (id < lastGoodAttempt) return
    if (kind !== "unlock" && status !== "blocked") console.warn("[order-alarm] playback blocked:", err)
    status = "blocked"
    if (id === attempt) toSilence("blocked")
    arm()
    emit()
    return
  }

  if (id !== attempt) return
  if (status !== "failed") console.warn("[order-alarm] playback failed:", err)
  onUnplayable(url)
}

/** Somebody else stopped the playback: media key, lock screen, a call, another app. */
function onInterrupted(): void {
  if (mode === "unlock" && status === "checking") status = "unknown"
  toSilence("aborted")
  emit()
}

function onElementPause(): void {
  if (!audio || !audio.paused || audio.ended || mode === "idle" || mode === "unlock") return
  onInterrupted()
}

/** The current source cannot be played: fall back to the bundled sound. */
function onUnplayable(url: string): void {
  clearStartTimer()
  const interrupted = mode
  if (url === SILENCE) {
    // Only the probe failed; the real sound may still work, so keep trying it.
    if (status === "checking") status = "unknown"
    toSilence("failed")
    loadUrl(targetUrl)
  } else if (url !== DEFAULT_ORDER_SOUND_URL) {
    targetUrl = DEFAULT_ORDER_SOUND_URL
    if (interrupted === "idle") loadUrl(targetUrl)
    else void start(interrupted, { carry: true })
    return
  } else {
    suspect = true
    status = "failed"
    toSilence("failed")
    arm()
  }
  emit()
}

function onElementError(): void {
  // A start that is still pending rejects as well; `onRejected` deals with it (and
  // may already have moved on to the next source).
  if (!loadedUrl || startTimer) return
  // A background preload of the default sound may fail while offline; `start`
  // reloads it, so only a failure during playback counts.
  if (mode === "idle" && loadedUrl === DEFAULT_ORDER_SOUND_URL) return
  attempt++
  onUnplayable(loadedUrl)
}

function onElementEnded(): void {
  if (verifying) onPlaying()
  if (mode === "chime" || mode === "test") {
    mode = "idle"
    emit()
  }
}

function onStartTimeout(): void {
  startTimer = null
  if (!loadedUrl) return
  if (mode === "unlock") {
    // Undecided (e.g. a tab opened in the background). Leave play() pending — it
    // still reports whenever it settles — but do not claim sound works.
    if (status === "checking") status = "unknown"
    emit()
    return
  }
  if (loadedUrl !== DEFAULT_ORDER_SOUND_URL || mode === "test") {
    console.warn("[order-alarm] sound did not start in time:", loadedUrl)
    stalled = true
    attempt++
    onUnplayable(loadedUrl)
    return
  }
  // The bundled sound itself is stuck. play() stays pending in case it recovers;
  // the retry loads the file anew.
  stalled = true
  suspect = true
  if (status !== "blocked" && status !== "failed") status = "unknown"
  arm()
  emit()
}

/** Stops whatever is audible; an unlock attempt is left to finish. */
function halt(): void {
  if (mode === "unlock") return
  const audible = audio !== null && !audio.paused
  if (mode === "idle" && !audible) return
  toSilence("aborted")
  // Stopped before it got going: still spend this gesture on unlocking.
  if (status !== "enabled") void start("unlock")
}

// ── Autoplay unlock ──────────────────────────────────────────────────────────

/**
 * Touch browsers grant playback on touchend/pointerup/click, not on
 * touchstart/pointerdown. Capture phase, so a stopPropagation() in the page
 * cannot hide a gesture. Listeners stay until playback has really succeeded.
 */
const GESTURES = ["pointerup", "touchend", "click", "keydown"] as const
let armed = false

function onGesture(event: Event): void {
  const target = event.target
  if (target instanceof Element && target.closest(`[${ORDER_SOUND_CONTROL}]`)) return
  if (rings.size > 0) {
    void start("alarm", { rewind: false })
    return
  }
  // Moving the focus to the banner's button must not make the button disappear.
  if (event instanceof KeyboardEvent && (event.key === "Tab" || event.key === "Shift")) return
  // Permission is not what is missing, and silence cannot clear `suspect`: without
  // this every key press would load the silent clip and the sound again.
  if (suspect && status !== "blocked") return
  if (mode === "idle" || mode === "unlock") void start("unlock")
}

function arm(): void {
  if (armed) return
  armed = true
  GESTURES.forEach((e) => window.addEventListener(e, onGesture, { capture: true, passive: true }))
}

function disarm(): void {
  if (!armed) return
  armed = false
  GESTURES.forEach((e) => window.removeEventListener(e, onGesture, { capture: true }))
}

// ── Ring bookkeeping ─────────────────────────────────────────────────────────

function anyWaiting(): boolean {
  return [...rings.values()].some((r) => r.endsAt === null)
}

function unstartRings(): void {
  const now = Date.now()
  rings.forEach((ring) => {
    if (ring.endsAt === null) return
    ring.budget = Math.max(0, ring.endsAt - now)
    ring.endsAt = null
  })
  scheduleRingTimer()
}

/** When a ring is over, whether it was heard or not. */
function deadlineOf(ring: Ring): number {
  if (ring.endsAt !== null) return ring.endsAt
  return ring.budget > 0 ? ring.expires : 0
}

function scheduleRingTimer(): void {
  if (ringTimer) clearTimeout(ringTimer)
  ringTimer = null
  if (rings.size === 0) return
  const next = Math.min(...[...rings.values()].map(deadlineOf))
  ringTimer = setTimeout(() => {
    const now = Date.now()
    rings.forEach((ring, id) => {
      if (deadlineOf(ring) > now) return
      rings.delete(id)
      markDone(id)
    })
    afterRingsChanged()
  }, Math.max(0, next - Date.now()))
}

function afterRingsChanged(): void {
  if (rings.size === 0 && (mode === "alarm" || mode === "idle")) halt()
  scheduleRingTimer()
  emit()
}

/** Keeps trying, and stops the panel from looking fine, while an order is unheard. */
function watchWaiting(): void {
  if (!anyWaiting()) {
    if (warnTimer) clearTimeout(warnTimer)
    if (retryTimer) clearTimeout(retryTimer)
    warnTimer = retryTimer = null
    return
  }
  if (!warnTimer && (status === "enabled" || status === "checking")) {
    warnTimer = setTimeout(() => {
      warnTimer = null
      if (status !== "enabled" && status !== "checking") return
      status = "unknown"
      arm()
      emit()
    }, WARN_AFTER_MS)
  }
  retryTimer ??= setTimeout(() => {
    retryTimer = null
    // One that is still starting or being verified has its own timeout.
    if (!startTimer && !verifying) void start("alarm", { rewind: false })
    else watchWaiting()
  }, RETRY_MS)
}

/** Survives a reload of this tab, so a silenced order does not ring again after it. */
function doneOrders(): Set<string> {
  if (done) return done
  done = new Set()
  try {
    const stored: unknown = JSON.parse(window.sessionStorage.getItem(DONE_STORAGE_KEY) ?? "[]")
    if (Array.isArray(stored)) stored.forEach((id) => { if (typeof id === "string") done?.add(id) })
  } catch { /* storage unavailable: remembered in memory only */ }
  return done
}

function markDone(id: string): void {
  const ids = doneOrders()
  if (!id || ids.has(id)) return
  ids.add(id)
  if (ids.size > MEMORY_LIMIT) ids.delete(ids.values().next().value as string)
  // A list refresh marks many at once; write them together.
  if (doneDirty) return
  doneDirty = true
  queueMicrotask(() => {
    doneDirty = false
    try {
      window.sessionStorage.setItem(DONE_STORAGE_KEY, JSON.stringify([...ids]))
    } catch { /* see above */ }
  })
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates the audio element, finds out whether the browser lets it play and
 * resolves the configured sound. Re-fetches once the cached url goes stale, so a
 * transient failure at page load does not pin the session to the default sound
 * and an admin's change is picked up without a reload.
 */
export function prewarmOrderAlarm(): void {
  if (typeof window === "undefined") return

  if (!audio) {
    ensureAudio()
    arm()
    void start("unlock")
  }

  if (urlFetch || Date.now() - urlResolvedAt <= URL_TTL_MS) return
  urlFetch = fetchOrderSoundUrl()
    .then((url) => {
      if (!url) return
      urlResolvedAt = Date.now()
      configuredUrl = url
      targetUrl = url
      if (mode === "idle") loadUrl(url)
      else if (mode !== "unlock" && loadedUrl !== url) void start(mode, { carry: true })
    })
    .catch(() => {})
    .finally(() => { urlFetch = null })
}

export function playOrderAlarm(orderId?: string, options: AlarmOptions = {}): void {
  if (typeof window === "undefined") return

  prewarmOrderAlarm()
  const loop = options.loop ?? true
  const until = options.until ?? Infinity
  const now = Date.now()

  // Suppress only a repeated announcement of the same order — never a new one.
  if (orderId) {
    if (now - (announcedAt.get(orderId) ?? -Infinity) < DEDUPE_MS) return
    if (loop && (rings.has(orderId) || doneOrders().has(orderId))) return
    announcedAt.set(orderId, now)
    if (announcedAt.size > MEMORY_LIMIT) announcedAt.delete(announcedAt.keys().next().value as string)
  }

  if (!loop) {
    if (rings.size === 0) void start("chime")
    return
  }

  rings.set(orderId ?? "", {
    expires: Math.min(now + WAITING_MS, until),
    until,
    budget: RING_MS,
    endsAt: null,
  })
  scheduleRingTimer()
  void start("alarm")
}

/**
 * Catch-up for an order found still unanswered: placed while the socket was down
 * or the tab was loading. Rings only inside the order's accept window —
 * after it the server has cancelled the order, and without one (an online order
 * that is not paid yet) there is nothing to accept — and only if this tab has not
 * rung it or had it silenced before. The window is measured on the server's clock
 * when it is known, since a tablet's may be off. Returns whether it started to ring.
 */
export function ringPendingOrder(
  orderId: string,
  acceptDeadline: string | null | undefined,
  serverNow: number | null = null,
): boolean {
  if (!acceptDeadline) return false
  const now = Date.now()
  const until = now + (Date.parse(acceptDeadline) - (serverNow ?? now))
  if (!(until > now) || rings.has(orderId)) return false
  playOrderAlarm(orderId, { until })
  return rings.has(orderId)
}

/**
 * With an order id: that order has been handled; others keep ringing.
 * Without: an explicit "stop" — silences every order for good.
 */
export function stopOrderAlarm(orderId?: string): void {
  if (orderId !== undefined) {
    markDone(orderId)
    if (rings.delete(orderId)) afterRingsChanged()
    return
  }
  rings.forEach((_, id) => markDone(id))
  rings.clear()
  halt()
  scheduleRingTimer()
  emit()
}

/** The panel is being left. Silent, but nothing counts as handled. */
export function leaveOrderAlarm(): void {
  rings.forEach((_, id) => announcedAt.delete(id))
  rings.clear()
  halt()
  scheduleRingTimer()
  emit()
}

/**
 * Plays the configured sound once, audibly. Call it from a click handler. If an
 * order is waiting for sound, its alarm starts instead.
 */
export function testOrderSound(): Promise<PlayResult> {
  prewarmOrderAlarm()
  const result = start(rings.size > 0 ? "alarm" : "test")
  void result.then((outcome) => {
    if (outcome !== "blocked") return
    needsPermission = true
    emit()
  })
  return result
}
