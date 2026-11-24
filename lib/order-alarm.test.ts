/** @jest-environment jsdom */

const fetchOrderSoundUrl = jest.fn()
jest.mock("./order-sound", () => ({
  DEFAULT_ORDER_SOUND_URL: "/sounds/sound.mp3",
  fetchOrderSoundUrl: () => fetchOrderSoundUrl(),
}))

const DEFAULT = "/sounds/sound.mp3"
const CUSTOM = "https://api.test/uploads/custom.mp3"

type Outcome = "ok" | "pending" | "AbortError" | "NotAllowedError" | "NotSupportedError"

/** Does an accepted play() really advance? (On the iPad it may not.) */
let advances = true
/** What the browser answers to play(); tests swap it. */
let policy: (src: string) => Outcome = () => "ok"
let instances: FakeAudio[] = []

class FakeAudio extends EventTarget {
  loop = false
  muted = false
  paused = true
  ended = false
  currentTime = 0
  preload = ""
  error: unknown = null
  /** Every play() call: the source at that moment and the browser's answer. */
  plays: { src: string; outcome: Outcome; muted: boolean }[] = []
  /** How many times a source was loaded. */
  loads: string[] = []
  private source = ""
  private pending: { resolve: () => void; reject: (err: unknown) => void }[] = []
  constructor() {
    super()
    instances.push(this)
  }
  get src() { return this.source }
  /** As in the spec: loading stops playback and rejects pending play() promises. */
  set src(value: string) {
    this.source = value
    this.loads.push(value)
    this.abortPending()
    this.paused = true
    this.ended = false
    this.currentTime = 0
    this.error = null
  }
  play = jest.fn(() => {
    const outcome = policy(this.src)
    this.plays.push({ src: this.src, outcome, muted: this.muted })
    if (outcome === "pending") {
      this.paused = false
      return new Promise<void>((resolve, reject) => { this.pending.push({ resolve, reject }) })
    }
    // As in the spec: only a refusal leaves the element paused.
    if (outcome === "NotAllowedError") return Promise.reject(named(outcome))
    this.paused = false
    if (outcome !== "ok") return Promise.reject(named(outcome))
    this.progress()
    return Promise.resolve()
  })
  pause = jest.fn(() => {
    if (this.paused) return
    this.paused = true
    this.abortPending()
    queueMicrotask(() => this.dispatchEvent(new Event("pause")))
  })
  /** The stalled play() calls finally start. */
  resolvePending() {
    this.pending.splice(0).forEach((p) => p.resolve())
    this.progress()
  }
  private abortPending() {
    this.pending.splice(0).forEach((p) => p.reject(named("AbortError")))
  }
  /** Moves the position once play()'s own reactions have run, if it really plays. */
  private progress() {
    if (!advances) return
    const loads = this.loads.length
    void Promise.resolve().then(() => {}).then(() => {}).then(() => {
      if (this.paused || this.loads.length !== loads) return
      this.currentTime += 0.1
      this.dispatchEvent(new Event("timeupdate"))
    })
  }
  get audible() {
    return !this.paused && !this.muted && !this.src.startsWith("data:")
  }
  /** play() calls for a real sound, i.e. not the silent unlock clip. */
  get realPlays() {
    return this.plays.filter((p) => !p.src.startsWith("data:"))
  }
}

const named = (name: string) => Object.assign(new Error(name), { name })
const block = () => { policy = () => "NotAllowedError" }
const allow = () => { policy = () => "ok" }
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }
const gesture = async (type: string) => { window.dispatchEvent(new Event(type)); await flush() }
const advance = async (ms: number) => { jest.advanceTimersByTime(ms); await flush() }

describe("order alarm", () => {
  let alarm: typeof import("./order-alarm")
  let warn: jest.SpyInstance
  const el = () => instances[0]
  const state = () => alarm.getOrderSoundState()

  /** A fresh page: new module state. */
  const loadModule = () => {
    jest.resetModules()
    alarm = require("./order-alarm")
  }

  beforeEach(async () => {
    jest.useFakeTimers({ doNotFake: ["queueMicrotask"] })
    window.sessionStorage.clear()
    instances = []
    advances = true
    allow()
    fetchOrderSoundUrl.mockReset().mockResolvedValue(DEFAULT)
    ;(global as unknown as { Audio: unknown }).Audio = FakeAudio
    warn = jest.spyOn(console, "warn").mockImplementation(() => {})
    loadModule()
  })

  afterEach(async () => {
    // Drop this instance's window listeners so they cannot leak into the next test.
    allow()
    advances = true
    await gesture("click")
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  describe("de-duplication", () => {
    it("chimes once and dedupes the same order id within 5s, then again after", async () => {
      alarm.prewarmOrderAlarm()
      await flush()
      alarm.playOrderAlarm("o1", { loop: false })
      alarm.playOrderAlarm("o1", { loop: false })
      expect(el().realPlays).toHaveLength(1)
      alarm.playOrderAlarm("o2", { loop: false })
      expect(el().realPlays).toHaveLength(2)
      await advance(5_100)
      alarm.playOrderAlarm("o2", { loop: false })
      expect(el().realPlays).toHaveLength(3)
      expect(el().loop).toBe(false)
    })

    it("dedupes per id, so interleaved announcements of two orders do not restart each other", async () => {
      alarm.playOrderAlarm("a")
      alarm.playOrderAlarm("b")
      const before = el().realPlays.length
      alarm.playOrderAlarm("a")
      alarm.playOrderAlarm("b")
      expect(el().realPlays).toHaveLength(before)
    })

    it("a late second announcement of an order that was already handled does not ring", async () => {
      alarm.playOrderAlarm("o1")
      await flush()
      alarm.stopOrderAlarm("o1")
      await advance(8_000)
      alarm.playOrderAlarm("o1")
      await flush()
      expect(el().audible).toBe(false)
      expect(state().ringing).toBe(false)
    })
  })

  describe("repeat and 60 s cap", () => {
    it("repeats until the 60 s are up", async () => {
      alarm.playOrderAlarm("o1")
      await flush()
      expect(el().loop).toBe(true)
      expect(el().audible).toBe(true)
      expect(state().ringing).toBe(true)
      await advance(59_900)
      expect(el().audible).toBe(true)
      await advance(200)
      expect(el().audible).toBe(false)
      expect(state().ringing).toBe(false)
    })

    it("handling one order leaves a second one ringing, and each has its own 60 s", async () => {
      alarm.playOrderAlarm("a")
      await flush()
      await advance(30_000)
      alarm.playOrderAlarm("b")
      await flush()
      alarm.stopOrderAlarm("a")
      expect(el().audible).toBe(true)
      await advance(40_000) // a's 60 s would be over
      expect(el().audible).toBe(true)
      await advance(20_100)
      expect(el().audible).toBe(false)
    })

    it("stops when the last ringing order is handled; an unrelated id does nothing", async () => {
      alarm.playOrderAlarm("a")
      await flush()
      alarm.stopOrderAlarm("zzz")
      expect(el().audible).toBe(true)
      alarm.stopOrderAlarm("a")
      expect(el().audible).toBe(false)
    })

    it("stop without an id silences everything", async () => {
      alarm.playOrderAlarm("a")
      alarm.playOrderAlarm("b")
      await flush()
      alarm.stopOrderAlarm()
      expect(el().audible).toBe(false)
      expect(state()).toMatchObject({ ringing: false, waiting: false })
    })

    it("a single chime never turns a repeating alarm into a one-off", async () => {
      alarm.playOrderAlarm("a")
      await flush()
      alarm.playOrderAlarm("b", { loop: false })
      await flush()
      expect(el().loop).toBe(true)
    })
  })

  describe("autoplay unlock", () => {
    it("is 'enabled' without a gesture when the browser already allows playback", async () => {
      alarm.prewarmOrderAlarm()
      expect(state().status).toBe("checking")
      await flush()
      expect(state().status).toBe("enabled")
    })

    it("probes unmuted: a muted success would prove nothing", async () => {
      alarm.prewarmOrderAlarm()
      await flush()
      expect(el().plays[0]).toMatchObject({ muted: false })
      expect(el().plays[0].src).toMatch(/^data:audio\/wav/)
    })

    it("reports blocked, and is never 'enabled' until play() succeeds", async () => {
      block()
      alarm.prewarmOrderAlarm()
      await flush()
      expect(state().status).toBe("blocked")
      await gesture("click")
      expect(state().status).toBe("blocked")
      allow()
      await gesture("click")
      expect(state().status).toBe("enabled")
      // Unlocked silently, with the real sound loaded for the next order.
      expect(el().realPlays).toHaveLength(0)
      expect(el().src).toBe(DEFAULT)
    })

    it.each(["pointerup", "touchend", "click", "keydown"])("unlocks on %s", async (type) => {
      block()
      alarm.prewarmOrderAlarm()
      await flush()
      allow()
      await gesture(type)
      expect(state().status).toBe("enabled")
    })

    it("a tap whose pointerup is refused is still unlocked by its touchend/click", async () => {
      block()
      alarm.prewarmOrderAlarm()
      await flush()
      window.dispatchEvent(new Event("pointerup")) // refused
      allow()
      window.dispatchEvent(new Event("touchend")) // accepted, before the refusal is reported
      window.dispatchEvent(new Event("click"))
      await flush()
      expect(state().status).toBe("enabled")
    })

    it("calls play() synchronously inside the gesture handler", async () => {
      block()
      alarm.prewarmOrderAlarm()
      await flush()
      const before = el().plays.length
      window.dispatchEvent(new Event("touchend"))
      expect(el().plays.length).toBe(before + 1)
    })

    it("works even when the page stops the event's propagation", async () => {
      block()
      alarm.prewarmOrderAlarm()
      await flush()
      allow()
      const button = document.createElement("button")
      button.addEventListener("click", (e) => e.stopPropagation())
      document.body.appendChild(button)
      button.click()
      await flush()
      expect(state().status).toBe("enabled")
      button.remove()
    })

    it("re-arms when a later play() is refused", async () => {
      alarm.prewarmOrderAlarm()
      await flush()
      block()
      alarm.playOrderAlarm("o1")
      await flush()
      expect(state()).toMatchObject({ status: "blocked", waiting: true, ringing: false })
      expect(warn).toHaveBeenCalledWith("[order-alarm] playback blocked:", expect.any(Error))
      allow()
      await gesture("keydown")
      expect(state()).toMatchObject({ status: "enabled", waiting: false, ringing: true })
    })

    it("an interrupted probe proves nothing, and stays armed", async () => {
      policy = () => "AbortError"
      alarm.prewarmOrderAlarm()
      await flush()
      expect(state().status).toBe("unknown")
      allow()
      await gesture("click")
      expect(state().status).toBe("enabled")
    })

    it("a late refusal of an earlier attempt does not undo a later success", async () => {
      let refuse: (err: unknown) => void = () => {}
      alarm.prewarmOrderAlarm()
      await flush()
      policy = () => "ok"
      el().play.mockImplementationOnce(() => new Promise<void>((_, reject) => { refuse = reject }))
      alarm.playOrderAlarm("a")
      alarm.playOrderAlarm("b")
      await flush()
      expect(state()).toMatchObject({ status: "enabled", ringing: true })
      refuse(named("NotAllowedError"))
      await flush()
      expect(state()).toMatchObject({ status: "enabled", ringing: true })
    })

    it("walking to the banner's button with Tab does not unlock, and so remove, it", async () => {
      block()
      alarm.prewarmOrderAlarm()
      await flush()
      allow()
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }))
      await flush()
      expect(state().status).toBe("blocked")
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }))
      await flush()
      expect(state().status).toBe("enabled")
    })

    it("leaves gestures on its own controls to their click handlers", async () => {
      block()
      alarm.prewarmOrderAlarm()
      await flush()
      allow()
      const button = document.createElement("button")
      button.setAttribute(alarm.ORDER_SOUND_CONTROL, "")
      button.innerHTML = "<span>x</span>"
      document.body.appendChild(button)
      button.firstElementChild!.dispatchEvent(new Event("keydown", { bubbles: true }))
      await flush()
      expect(state().status).toBe("blocked")
      await expect(alarm.testOrderSound()).resolves.toBe("ok")
      button.remove()
    })

    it("stops pretending to check when the probe never answers", async () => {
      policy = () => "pending"
      alarm.prewarmOrderAlarm()
      await advance(2_100)
      expect(state().status).toBe("unknown")
    })

    it("once enabled, gestures no longer touch the element", async () => {
      alarm.prewarmOrderAlarm()
      await flush()
      const before = el().plays.length
      await gesture("click")
      expect(el().plays.length).toBe(before)
    })

    it("prewarming repeatedly probes once", async () => {
      alarm.prewarmOrderAlarm()
      alarm.prewarmOrderAlarm()
      await flush()
      expect(el().plays).toHaveLength(1)
    })
  })

  describe("play() that resolves without advancing (seen on iPadOS)", () => {
    it("an unlock like that does not count, and the next gesture tries again", async () => {
      block()
      alarm.prewarmOrderAlarm()
      await flush()
      allow()
      advances = false
      await gesture("click")
      await advance(3_100)
      expect(state().status).toBe("blocked")
      advances = true
      await gesture("click")
      expect(state().status).toBe("enabled")
    })

    it("an alarm like that is not called enabled and waits for a gesture", async () => {
      alarm.prewarmOrderAlarm()
      await flush()
      advances = false
      alarm.playOrderAlarm("o1")
      await flush()
      await advance(3_100)
      expect(state()).toMatchObject({ status: "unknown", ringing: false, waiting: true })
      expect(el().paused).toBe(true)
      advances = true
      await gesture("click")
      expect(state()).toMatchObject({ status: "enabled", ringing: true })
      expect(el().audible).toBe(true)
    })

    it("an order that was ringing waits again when a restart gets stuck, keeping what is left of its 60 s", async () => {
      alarm.playOrderAlarm("a")
      await flush()
      await advance(20_000)
      el().pause() // so that the restart below has to play again
      advances = false
      alarm.playOrderAlarm("b")
      await flush()
      await advance(3_100)
      expect(state()).toMatchObject({ ringing: false, waiting: true })
      advances = true
      alarm.stopOrderAlarm("b")
      await gesture("click")
      expect(state().ringing).toBe(true)
      await advance(39_000)
      expect(el().audible).toBe(true)
      await advance(1_500)
      expect(el().audible).toBe(false)
    })

    it("a silent unlock does not call a sound that failed to run enabled", async () => {
      alarm.prewarmOrderAlarm()
      await flush()
      advances = false
      alarm.playOrderAlarm("o1")
      await flush()
      await advance(3_100)
      alarm.stopOrderAlarm()
      advances = true
      await gesture("click")
      expect(state().status).toBe("unknown")
    })

    it.each([
      ["unknown", () => {}],
      ["blocked", block],
    ])("after a real failure, gestures do not reload the sound over and over (%s)", async (_, then) => {
      alarm.prewarmOrderAlarm()
      await flush()
      advances = false
      alarm.playOrderAlarm("o1", { loop: false })
      await flush()
      await advance(3_100)
      then()
      alarm.playOrderAlarm("o2", { loop: false })
      await flush()
      await advance(3_100)
      allow()
      advances = true
      await gesture("click") // may still win the permission
      const loads = el().loads.length
      for (let i = 0; i < 20; i++) await gesture("keydown")
      expect(el().loads.length).toBe(loads)
      expect(state().status).toBe("unknown")
    })

    it("a timeupdate without movement, or while nothing is starting, proves nothing", async () => {
      block()
      alarm.prewarmOrderAlarm()
      await flush()
      el().dispatchEvent(new Event("timeupdate"))
      expect(state().status).toBe("blocked")
      allow()
      advances = false
      alarm.playOrderAlarm("a")
      await flush()
      el().dispatchEvent(new Event("timeupdate"))
      expect(state()).toMatchObject({ status: "blocked", ringing: false })
    })

    it("a test like that ends as failed, not ok", async () => {
      alarm.prewarmOrderAlarm()
      await flush()
      advances = false
      const result = alarm.testOrderSound()
      await flush()
      await advance(3_100)
      await expect(result).resolves.toBe("failed")
    })
  })

  describe("orders that arrive while blocked", () => {
    beforeEach(async () => {
      block()
      alarm.prewarmOrderAlarm()
      await flush()
      alarm.playOrderAlarm("o1")
      await flush()
    })

    it("ring from the first successful gesture, for a full 60 s", async () => {
      await advance(90_000)
      await gesture("click") // still refused
      expect(state()).toMatchObject({ status: "blocked", waiting: true })
      allow()
      await gesture("click")
      expect(el().audible).toBe(true)
      expect(el().loop).toBe(true)
      expect(el().src).toBe(DEFAULT)
      expect(state()).toMatchObject({ status: "enabled", ringing: true, waiting: false })
      await advance(59_900)
      expect(el().audible).toBe(true)
      await advance(200)
      expect(el().audible).toBe(false)
    })

    it("do not ring if they were answered in the meantime", async () => {
      alarm.stopOrderAlarm("o1")
      expect(state().waiting).toBe(false)
      allow()
      await gesture("click")
      expect(el().realPlays.filter((p) => p.outcome === "ok")).toHaveLength(0)
      expect(state()).toMatchObject({ status: "enabled", ringing: false })
    })

    it("are given up after 5 minutes", async () => {
      await advance(5 * 60_000 + 100)
      allow()
      await gesture("click")
      expect(state().ringing).toBe(false)
    })

    it("opening that very order with the unlocking tap unlocks without ringing on", async () => {
      allow()
      window.dispatchEvent(new Event("click"))
      alarm.stopOrderAlarm("o1") // the card's own click handler
      await flush()
      expect(el().audible).toBe(false)
      expect(state()).toMatchObject({ status: "enabled", ringing: false })
    })
  })

  describe("sound file", () => {
    it("keeps the same element across unlock, source swap, fallback and alarms", async () => {
      fetchOrderSoundUrl.mockResolvedValue(CUSTOM)
      alarm.prewarmOrderAlarm()
      await flush()
      expect(el().src).toBe(CUSTOM)
      alarm.playOrderAlarm("a")
      await flush()
      alarm.stopOrderAlarm()
      policy = (src) => (src === CUSTOM ? "NotSupportedError" : "ok")
      alarm.playOrderAlarm("b")
      await flush()
      expect(el().src).toBe(DEFAULT)
      expect(instances).toHaveLength(1)
    })

    it("a url that resolves while ringing carries on ringing with the configured sound", async () => {
      let resolve: (url: string) => void = () => {}
      fetchOrderSoundUrl.mockReturnValue(new Promise<string>((r) => { resolve = r }))
      alarm.playOrderAlarm("a")
      await flush()
      expect(el().src).toBe(DEFAULT)
      resolve(CUSTOM)
      await flush()
      expect(el().src).toBe(CUSTOM)
      expect(el().audible).toBe(true)
      expect(el().loop).toBe(true)
      expect(instances).toHaveLength(1)
    })

    it("fetches the url once even when prewarmed twice before it resolves", async () => {
      alarm.prewarmOrderAlarm()
      alarm.prewarmOrderAlarm()
      await flush()
      expect(fetchOrderSoundUrl).toHaveBeenCalledTimes(1)
    })

    it("a failed lookup keeps the current sound and is retried", async () => {
      fetchOrderSoundUrl.mockResolvedValueOnce(CUSTOM).mockResolvedValue(null)
      alarm.prewarmOrderAlarm()
      await flush()
      await advance(16 * 60_000)
      alarm.prewarmOrderAlarm()
      await flush()
      expect(el().src).toBe(CUSTOM)
      alarm.prewarmOrderAlarm()
      expect(fetchOrderSoundUrl).toHaveBeenCalledTimes(3)
    })

    it("falls back to the bundled sound when the custom one cannot be played", async () => {
      fetchOrderSoundUrl.mockResolvedValue(CUSTOM)
      policy = (src) => (src === CUSTOM ? "NotSupportedError" : "ok")
      alarm.prewarmOrderAlarm()
      await flush()
      alarm.playOrderAlarm("a")
      await flush()
      expect(el().src).toBe(DEFAULT)
      expect(el().audible).toBe(true)
      expect(state()).toMatchObject({ status: "enabled", ringing: true })
    })

    it("falls back when the custom file breaks while ringing", async () => {
      fetchOrderSoundUrl.mockResolvedValue(CUSTOM)
      alarm.prewarmOrderAlarm()
      await flush()
      alarm.playOrderAlarm("a")
      await flush()
      el().dispatchEvent(new Event("error"))
      await flush()
      expect(el().src).toBe(DEFAULT)
      expect(el().audible).toBe(true)
    })

    it("an error event during a pending start is left to play()'s own rejection", async () => {
      fetchOrderSoundUrl.mockResolvedValue(CUSTOM)
      alarm.prewarmOrderAlarm()
      await flush()
      policy = (src) => (src === CUSTOM ? "NotSupportedError" : "ok")
      const result = alarm.testOrderSound()
      el().dispatchEvent(new Event("error"))
      await flush()
      await expect(result).resolves.toBe("fallback")
      expect(el().realPlays.map((p) => p.src)).toEqual([CUSTOM, DEFAULT])
    })

    it("a late error event of the custom file is not blamed on the default that is starting", async () => {
      fetchOrderSoundUrl.mockResolvedValue(CUSTOM)
      alarm.prewarmOrderAlarm()
      await flush()
      policy = (src) => (src === CUSTOM ? "NotSupportedError" : "pending")
      alarm.playOrderAlarm("a")
      await flush()
      expect(el().src).toBe(DEFAULT)
      el().dispatchEvent(new Event("error"))
      expect(state().status).not.toBe("failed")
      el().resolvePending()
      await flush()
      expect(state()).toMatchObject({ status: "enabled", ringing: true })
    })

    it("a failed background preload of the default sound is not a verdict", async () => {
      alarm.prewarmOrderAlarm()
      await flush()
      el().dispatchEvent(new Event("error"))
      await flush()
      expect(state().status).toBe("enabled")
    })

    it("a failed background preload of the custom sound switches to the default ahead of time", async () => {
      fetchOrderSoundUrl.mockResolvedValue(CUSTOM)
      alarm.prewarmOrderAlarm()
      await flush()
      el().dispatchEvent(new Event("error"))
      expect(el().src).toBe(DEFAULT)
      expect(el().realPlays).toHaveLength(0)
    })

    it("reloads a source that is in error before playing it", async () => {
      alarm.prewarmOrderAlarm()
      await flush()
      el().error = {}
      alarm.playOrderAlarm("a")
      await flush()
      expect(el().loads.filter((u) => u === DEFAULT)).toHaveLength(2)
      expect(el().audible).toBe(true)
    })

    it("tapping while the custom file is stuck does not postpone the fallback", async () => {
      fetchOrderSoundUrl.mockResolvedValue(CUSTOM)
      block()
      alarm.prewarmOrderAlarm()
      await flush()
      policy = (src) => (src === CUSTOM ? "pending" : "ok")
      alarm.playOrderAlarm("a")
      for (let i = 0; i < 6; i++) {
        await advance(1_000)
        await gesture("click")
      }
      expect(el().src).toBe(DEFAULT)
      expect(el().audible).toBe(true)
    })

    it("falls back when the custom file never starts", async () => {
      fetchOrderSoundUrl.mockResolvedValue(CUSTOM)
      alarm.prewarmOrderAlarm()
      await flush()
      policy = (src) => (src === CUSTOM ? "pending" : "ok")
      alarm.playOrderAlarm("a")
      await advance(5_100)
      expect(el().src).toBe(DEFAULT)
      expect(el().audible).toBe(true)
    })

    it("does not fall back for an autoplay refusal", async () => {
      fetchOrderSoundUrl.mockResolvedValue(CUSTOM)
      alarm.prewarmOrderAlarm()
      await flush()
      block()
      alarm.playOrderAlarm("a")
      await flush()
      expect(el().src).toBe(CUSTOM)
    })

    it("reports failure, not 'enabled', when neither file plays — until one does", async () => {
      fetchOrderSoundUrl.mockResolvedValue(CUSTOM)
      policy = (src) => (src.startsWith("data:") ? "ok" : "NotSupportedError")
      alarm.prewarmOrderAlarm()
      await flush()
      await expect(alarm.testOrderSound()).resolves.toBe("failed")
      expect(state().status).toBe("failed")
      await gesture("click") // silence still plays, but that must not count
      expect(state().status).toBe("failed")
      allow()
      await expect(alarm.testOrderSound()).resolves.toBe("fallback")
      expect(state().status).toBe("enabled")
    })
  })

  describe("test sound", () => {
    it("plays the configured sound once and ends by itself", async () => {
      fetchOrderSoundUrl.mockResolvedValue(CUSTOM)
      alarm.prewarmOrderAlarm()
      await flush()
      await expect(alarm.testOrderSound()).resolves.toBe("ok")
      expect(el().src).toBe(CUSTOM)
      expect(el().loop).toBe(false)
      expect(state().testing).toBe(true)
      el().dispatchEvent(new Event("ended"))
      expect(state().testing).toBe(false)
    })

    it("can be stopped", async () => {
      alarm.prewarmOrderAlarm()
      await flush()
      await alarm.testOrderSound()
      alarm.stopOrderAlarm()
      expect(el().audible).toBe(false)
      expect(state().testing).toBe(false)
    })

    it("says so when the browser refuses", async () => {
      block()
      alarm.prewarmOrderAlarm()
      await flush()
      await expect(alarm.testOrderSound()).resolves.toBe("blocked")
      expect(state().status).toBe("blocked")
    })

    it("an order that arrives during the test rings as an alarm", async () => {
      alarm.prewarmOrderAlarm()
      await flush()
      await alarm.testOrderSound()
      alarm.playOrderAlarm("a")
      await flush()
      expect(el().loop).toBe(true)
      expect(state()).toMatchObject({ ringing: true, testing: false })
    })

    it("asks for a browser permission only when the button itself is refused", async () => {
      block()
      alarm.prewarmOrderAlarm()
      await flush()
      await gesture("click")
      expect(state()).toMatchObject({ status: "blocked", needsPermission: false })
      await alarm.testOrderSound()
      await flush()
      expect(state()).toMatchObject({ status: "blocked", needsPermission: true })
      allow()
      await alarm.testOrderSound()
      expect(state()).toMatchObject({ status: "enabled", needsPermission: false })
      block()
      alarm.playOrderAlarm("a")
      await flush()
      expect(state()).toMatchObject({ status: "blocked", needsPermission: false })
    })

    it("starts the waiting alarm instead when an order is waiting for sound", async () => {
      block()
      alarm.playOrderAlarm("a")
      await flush()
      allow()
      await alarm.testOrderSound()
      expect(state()).toMatchObject({ ringing: true, testing: false })
    })
  })

  describe("an order that should ring but is not heard", () => {
    beforeEach(async () => {
      alarm.prewarmOrderAlarm()
      await flush()
      expect(state().status).toBe("enabled")
    })

    it("stops looking enabled after 2 s and listens for gestures again", async () => {
      policy = () => "pending"
      alarm.playOrderAlarm("a")
      await advance(1_900)
      expect(state()).toMatchObject({ status: "enabled", waiting: true, ringing: false })
      await advance(200)
      expect(state()).toMatchObject({ status: "unknown", waiting: true, ringing: false })
      allow()
      await gesture("click")
      expect(state()).toMatchObject({ status: "enabled", ringing: true })
    })

    it("a stalled default file is loaded anew until it plays", async () => {
      policy = () => "pending"
      alarm.playOrderAlarm("a")
      const loads = el().loads.length
      await advance(5_100)
      expect(state().status).toBe("unknown")
      await advance(8_000)
      expect(el().loads.length).toBeGreaterThan(loads)
      allow()
      await advance(10_000)
      expect(state()).toMatchObject({ status: "enabled", ringing: true, waiting: false })
    })

    it("a stalled start that recovers on its own rings", async () => {
      policy = () => "pending"
      alarm.playOrderAlarm("a")
      await advance(5_100)
      el().resolvePending()
      await flush()
      expect(state()).toMatchObject({ status: "enabled", ringing: true })
    })

    it("recovers by itself when the network comes back after both files failed", async () => {
      policy = () => "NotSupportedError"
      alarm.playOrderAlarm("a")
      await flush()
      expect(state()).toMatchObject({ status: "failed", waiting: true })
      allow()
      await advance(4_100)
      expect(state()).toMatchObject({ status: "enabled", ringing: true })
    })

    it("recovers from an AbortError that was not ours", async () => {
      policy = () => "AbortError"
      alarm.playOrderAlarm("a")
      await flush()
      expect(state().ringing).toBe(false)
      allow()
      await advance(4_100)
      expect(state()).toMatchObject({ status: "enabled", ringing: true })
    })

    it("retries a refusal without a gesture too, warning only once", async () => {
      block()
      alarm.playOrderAlarm("a")
      for (let i = 0; i < 13; i++) await advance(1_000)
      expect(el().realPlays.length).toBeGreaterThanOrEqual(3)
      expect(warn).toHaveBeenCalledTimes(1)
      allow()
      await advance(4_100)
      expect(state()).toMatchObject({ status: "enabled", ringing: true })
    })

    it("stops retrying once the order is handled", async () => {
      block()
      alarm.playOrderAlarm("a")
      await flush()
      alarm.stopOrderAlarm("a")
      const plays = el().realPlays.length
      await advance(30_000)
      expect(el().realPlays).toHaveLength(plays)
    })

    it("stops retrying after 5 minutes", async () => {
      block()
      alarm.playOrderAlarm("a")
      await advance(5 * 60_000 + 100)
      const plays = el().realPlays.length
      await advance(60_000)
      expect(el().realPlays).toHaveLength(plays)
      expect(state().waiting).toBe(false)
    })

    it("a sound that starts within 2 s causes no warning", async () => {
      policy = () => "pending"
      alarm.playOrderAlarm("a")
      await advance(1_500)
      el().resolvePending()
      await advance(5_000)
      expect(state()).toMatchObject({ status: "enabled", ringing: true })
    })
  })

  describe("a pause that is not ours", () => {
    it("is not shown as ringing, and the alarm resumes for the rest of its 60 s", async () => {
      alarm.playOrderAlarm("a")
      await flush()
      await advance(20_000)
      el().pause() // media key, lock screen, a call
      await flush()
      expect(state()).toMatchObject({ ringing: false, waiting: true })
      await advance(2_100)
      expect(state().status).toBe("unknown")
      await advance(2_000)
      expect(state()).toMatchObject({ status: "enabled", ringing: true })
      await advance(39_000)
      expect(el().audible).toBe(true)
      await advance(1_500)
      expect(el().audible).toBe(false)
    })

    it("ends a test", async () => {
      alarm.prewarmOrderAlarm()
      await flush()
      await alarm.testOrderSound()
      el().pause()
      await flush()
      expect(state()).toMatchObject({ testing: false, status: "enabled" })
    })

    it("our own stop is not mistaken for one", async () => {
      alarm.playOrderAlarm("a")
      await flush()
      alarm.stopOrderAlarm()
      await flush()
      const plays = el().plays.length
      await advance(30_000)
      expect(el().plays).toHaveLength(plays)
      expect(state()).toMatchObject({ ringing: false, waiting: false, status: "enabled" })
    })

    it("the pause event of a stop does not hit the next order's alarm", async () => {
      alarm.playOrderAlarm("a")
      await flush()
      alarm.stopOrderAlarm()
      alarm.playOrderAlarm("b") // before the pause event is delivered
      await flush()
      expect(state()).toMatchObject({ ringing: true, waiting: false })
    })
  })

  describe("a refusal while another order is audible", () => {
    beforeEach(async () => {
      alarm.playOrderAlarm("a")
      await flush()
      expect(el().audible).toBe(true)
      block()
      alarm.playOrderAlarm("b")
      await flush()
    })

    it("silences what it can no longer control and lets both wait", async () => {
      expect(el().audible).toBe(false)
      expect(state()).toMatchObject({ status: "blocked", ringing: false, waiting: true })
    })

    it("stays stoppable", async () => {
      allow()
      await gesture("click")
      expect(el().audible).toBe(true)
      alarm.stopOrderAlarm()
      expect(el().audible).toBe(false)
    })

    it("does not outlive the 60 s", async () => {
      allow()
      await advance(4_100)
      expect(el().audible).toBe(true)
      await advance(60_100)
      expect(el().audible).toBe(false)
    })
  })

  it("stop silences the element even if the module has lost track of it", async () => {
    alarm.prewarmOrderAlarm()
    await flush()
    void el().play() // audible although no mode is active
    alarm.stopOrderAlarm()
    expect(el().paused).toBe(true)
  })

  describe("catch-up of pending orders", () => {
    const inFuture = (ms: number) => new Date(Date.now() + ms).toISOString()

    it("rings an order that is still inside its accept window", async () => {
      expect(alarm.ringPendingOrder("a", inFuture(90_000))).toBe(true)
      await flush()
      expect(state().ringing).toBe(true)
    })

    it.each([
      ["past its window", () => new Date(Date.now() - 1).toISOString()],
      ["without a window (not paid yet)", () => null],
      ["with an unreadable window", () => "soon"],
    ])("does not ring an order %s", async (_, deadline) => {
      alarm.ringPendingOrder("a", deadline())
      await flush()
      expect(state()).toMatchObject({ ringing: false, waiting: false })
    })

    describe("on a device whose clock is wrong", () => {
      const HOUR = 3_600_000

      it.each([["fast", HOUR], ["slow", -HOUR]])("rings inside the window by the server's clock (%s)", async (_, skew) => {
        const serverNow = Date.now() - skew
        const deadline = new Date(serverNow + 30_000).toISOString()
        expect(alarm.ringPendingOrder("a", deadline, serverNow)).toBe(true)
        await flush()
        await advance(29_900)
        expect(el().audible).toBe(true)
        await advance(200)
        expect(el().audible).toBe(false)
      })

      it.each([["fast", HOUR], ["slow", -HOUR]])("does not ring after it (%s)", (_, skew) => {
        const serverNow = Date.now() - skew
        expect(alarm.ringPendingOrder("a", new Date(serverNow - 1).toISOString(), serverNow)).toBe(false)
      })
    })

    it("does not ring past the accept deadline", async () => {
      alarm.ringPendingOrder("a", inFuture(10_000))
      await flush()
      await advance(9_900)
      expect(el().audible).toBe(true)
      await advance(200)
      expect(el().audible).toBe(false)
    })

    it("does not wait for sound past the accept deadline", async () => {
      block()
      alarm.ringPendingOrder("a", inFuture(10_000))
      await advance(10_100)
      expect(state().waiting).toBe(false)
    })

    it("rings once, however many refreshes find it", async () => {
      alarm.ringPendingOrder("a", inFuture(110_000))
      await flush()
      const plays = el().realPlays.length
      expect(alarm.ringPendingOrder("a", inFuture(110_000))).toBe(false)
      await advance(61_000)
      expect(alarm.ringPendingOrder("a", inFuture(49_000))).toBe(false)
      await flush()
      expect(el().realPlays).toHaveLength(plays)
      expect(el().audible).toBe(false)
    })

    it("does not repeat an order the socket already announced", async () => {
      alarm.playOrderAlarm("a")
      await flush()
      await advance(61_000)
      alarm.ringPendingOrder("a", inFuture(50_000))
      await flush()
      expect(state().ringing).toBe(false)
    })

    describe("after a reload", () => {
      const reload = () => {
        instances = []
        loadModule()
      }

      it.each([
        ["opened or answered", () => alarm.stopOrderAlarm("a")],
        ["silenced with Stop", () => alarm.stopOrderAlarm()],
        ["rung out", () => jest.advanceTimersByTime(60_100)],
      ])("an order that was %s stays silent", async (_, finish) => {
        alarm.playOrderAlarm("a")
        await flush()
        finish()
        await flush()
        reload()
        alarm.ringPendingOrder("a", inFuture(60_000))
        alarm.playOrderAlarm("a")
        await flush()
        expect(state()).toMatchObject({ ringing: false, waiting: false })
      })

      it("an order that was still ringing rings again", async () => {
        alarm.playOrderAlarm("a")
        await flush()
        reload()
        alarm.ringPendingOrder("a", inFuture(60_000))
        await flush()
        expect(state().ringing).toBe(true)
      })

      it("works without storage", async () => {
        jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied") })
        jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied") })
        alarm.playOrderAlarm("a")
        await flush()
        alarm.stopOrderAlarm("a")
        await flush()
        expect(state().ringing).toBe(false)
      })
    })

    it("leaving the panel silences without counting the order as handled", async () => {
      alarm.playOrderAlarm("a")
      await flush()
      alarm.leaveOrderAlarm()
      expect(el().audible).toBe(false)
      alarm.ringPendingOrder("a", inFuture(60_000))
      await flush()
      expect(state().ringing).toBe(true)
    })
  })

  it("a test whose default file never starts still ends", async () => {
    alarm.prewarmOrderAlarm()
    await flush()
    policy = () => "pending"
    const result = alarm.testOrderSound()
    await advance(5_100)
    await expect(result).resolves.toBe("failed")
    expect(state()).toMatchObject({ testing: false, status: "failed" })
  })

  it("a test reports 'fallback' when the custom file never starts", async () => {
    fetchOrderSoundUrl.mockResolvedValue(CUSTOM)
    alarm.prewarmOrderAlarm()
    await flush()
    policy = (src) => (src === CUSTOM ? "pending" : "ok")
    const result = alarm.testOrderSound()
    await advance(5_100)
    await expect(result).resolves.toBe("fallback")
  })

  it("notifies subscribers with a stable snapshot between changes", async () => {
    const listener = jest.fn()
    const unsubscribe = alarm.subscribeOrderSound(listener)
    alarm.prewarmOrderAlarm()
    await flush()
    expect(listener).toHaveBeenCalled()
    const snapshot = state()
    alarm.stopOrderAlarm("nothing")
    expect(state()).toBe(snapshot)
    unsubscribe()
  })
})
