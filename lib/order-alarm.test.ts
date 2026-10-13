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
})
