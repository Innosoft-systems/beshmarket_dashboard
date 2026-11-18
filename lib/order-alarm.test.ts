/** @jest-environment jsdom */

jest.mock("./order-sound", () => ({
  DEFAULT_ORDER_SOUND_URL: "/sounds/sound.mp3",
  fetchOrderSoundUrl: jest.fn(() => Promise.resolve("/sounds/sound.mp3")),
}))

type FakeAudio = {
  src: string
  loop: boolean
  muted: boolean
  paused: boolean
  currentTime: number
  play: jest.Mock
  pause: jest.Mock
}

describe("order alarm", () => {
  let instances: FakeAudio[]
  let alarm: typeof import("./order-alarm")
  let addSpy: jest.SpyInstance
  let removeSpy: jest.SpyInstance

  beforeEach(() => {
    jest.resetModules()
    jest.useFakeTimers()
    instances = []
    ;(global as unknown as { Audio: unknown }).Audio = function (src: string) {
      const a: FakeAudio = {
        src,
        loop: false,
        muted: false,
        paused: true,
        currentTime: 0,
        play: jest.fn(() => {
          a.paused = false
          return Promise.resolve()
        }),
        pause: jest.fn(() => {
          a.paused = true
        }),
      }
      instances.push(a)
      return a
    }
    addSpy = jest.spyOn(window, "addEventListener")
    removeSpy = jest.spyOn(window, "removeEventListener")
    alarm = require("./order-alarm")
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it("plays once and dedupes the same order id within 5s, then again after", () => {
    alarm.playOrderAlarm("o1", { loop: false })
    expect(instances[0].play).toHaveBeenCalledTimes(1)
    alarm.playOrderAlarm("o1", { loop: false })
    expect(instances[0].play).toHaveBeenCalledTimes(1)
    alarm.playOrderAlarm("o2", { loop: false })
    expect(instances[0].play).toHaveBeenCalledTimes(2)
    jest.advanceTimersByTime(5_100)
    alarm.playOrderAlarm("o2", { loop: false })
    expect(instances[0].play).toHaveBeenCalledTimes(3)
  })

  it("registers the autoplay unlock only once and removes listeners after the first gesture", () => {
    alarm.prewarmOrderAlarm()
    alarm.prewarmOrderAlarm()
    alarm.playOrderAlarm("x", { loop: false })
    const unlockAdds = addSpy.mock.calls.filter((c) => c[0] === "pointerdown")
    expect(unlockAdds).toHaveLength(1)

    const unlock = unlockAdds[0][1]
    window.dispatchEvent(new Event("pointerdown"))
    for (const type of ["pointerdown", "keydown", "touchstart"]) {
      expect(removeSpy).toHaveBeenCalledWith(type, unlock)
    }
  })

  it("warns instead of throwing when playback is blocked", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {})
    alarm.prewarmOrderAlarm()
    instances[0].play.mockImplementationOnce(() => Promise.reject(new Error("NotAllowedError")))
    alarm.playOrderAlarm("blocked", { loop: false })
    await Promise.resolve()
    await Promise.resolve()
    expect(warn).toHaveBeenCalledWith("[order-alarm] playback blocked:", expect.any(Error))
  })

  describe("autoplay blocked after reopening (visible unlock)", () => {
    const refusal = () => Object.assign(new Error("play() failed"), { name: "NotAllowedError" })
    const flush = async () => {
      for (let i = 0; i < 5; i++) await Promise.resolve()
    }

    it("the silent probe on load reports 'blocked' and notifies subscribers", async () => {
      const seen: string[] = []
      alarm.subscribeOrderAlarmSoundState(() => seen.push(alarm.getOrderAlarmSoundState()))
      // instances[0] = alarm element, instances[1] = probe; make the probe refuse.
      const RealAudio = (global as unknown as { Audio: (s: string) => FakeAudio }).Audio
      let n = 0
      ;(global as unknown as { Audio: unknown }).Audio = function (src: string) {
        const a = RealAudio(src)
        if (n++ === 1) a.play.mockImplementation(() => Promise.reject(refusal()))
        return a
      }
      alarm.prewarmOrderAlarm()
      await flush()
      expect(alarm.getOrderAlarmSoundState()).toBe("blocked")
      expect(seen).toEqual(["blocked"])
    })

    it("an allowed probe reports 'ready' and is paused again", async () => {
      alarm.prewarmOrderAlarm()
      await flush()
      expect(alarm.getOrderAlarmSoundState()).toBe("ready")
      expect(instances[1].pause).toHaveBeenCalled()
      expect((instances[1] as unknown as { volume: number }).volume).toBe(0)
    })

    it("a refused order alarm is kept and rung by the 'Ovozni yoqish' click", async () => {
      jest.spyOn(console, "warn").mockImplementation(() => {})
      alarm.prewarmOrderAlarm()
      await flush()
      instances[0].play.mockImplementationOnce(() => Promise.reject(refusal()))
      alarm.playOrderAlarm("o9", { loop: false })
      await flush()
      expect(alarm.getOrderAlarmSoundState()).toBe("blocked")

      await expect(alarm.unlockOrderAlarm()).resolves.toBe(true)
      expect(alarm.getOrderAlarmSoundState()).toBe("ready")
      // muted unlock + the kept order rung again
      expect(instances[0].play).toHaveBeenCalledTimes(3)
      expect(instances[0].muted).toBe(false)
    })

    it("a kept ring older than a minute is dropped (no stale alarm on unlock)", async () => {
      jest.spyOn(console, "warn").mockImplementation(() => {})
      alarm.prewarmOrderAlarm()
      await flush()
      instances[0].play.mockImplementationOnce(() => Promise.reject(refusal()))
      alarm.playOrderAlarm("old", { loop: false })
      await flush()
      jest.advanceTimersByTime(61_000)
      await alarm.unlockOrderAlarm()
      expect(instances[0].play).toHaveBeenCalledTimes(2) // refused + muted unlock only
    })

    it("a non-autoplay error does not claim sound is blocked", async () => {
      jest.spyOn(console, "warn").mockImplementation(() => {})
      alarm.prewarmOrderAlarm()
      await flush()
      instances[0].play.mockImplementationOnce(() => Promise.reject(Object.assign(new Error("x"), { name: "NotSupportedError" })))
      alarm.playOrderAlarm("o1", { loop: false })
      await flush()
      expect(alarm.getOrderAlarmSoundState()).toBe("ready")
    })
  })
})
