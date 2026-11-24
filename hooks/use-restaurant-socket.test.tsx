/** @jest-environment jsdom */
import { act, renderHook } from "@testing-library/react"
import { io } from "socket.io-client"
import { toast } from "sonner"
import { refreshAccessToken } from "@/lib/auth/refresh-client"
import { leaveOrderAlarm, playOrderAlarm, ringPendingOrder, stopOrderAlarm } from "@/lib/order-alarm"
import { fetchPendingOrders } from "@/lib/pending-orders"
import { useRestaurantSocket } from "./use-restaurant-socket"

jest.mock("socket.io-client", () => ({ io: jest.fn() }))
jest.mock("sonner", () => ({ toast: { info: jest.fn() } }))
const refresh = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: jest.fn() }) }))
jest.mock("@/lib/auth/refresh-client", () => ({ refreshAccessToken: jest.fn() }))
jest.mock("@/lib/order-alarm", () => ({
  leaveOrderAlarm: jest.fn(),
  playOrderAlarm: jest.fn(),
  prewarmOrderAlarm: jest.fn(),
  ringPendingOrder: jest.fn(),
  stopOrderAlarm: jest.fn(),
}))

jest.mock("@/lib/pending-orders", () => ({ fetchPendingOrders: jest.fn() }))

type Handler = (...args: unknown[]) => void
type Options = { auth: (cb: (data: { token: string }) => void) => void; reconnectionAttempts?: number; reconnection?: boolean }

function fakeSocket(options: Options) {
  const handlers: Record<string, Handler[]> = {}
  const socket = {
    active: true,
    connected: true,
    sentTokens: [] as string[],
    on: (event: string, fn: Handler) => { (handlers[event] ??= []).push(fn) },
    emit: (event: string, ...args: unknown[]) => handlers[event]?.forEach((fn) => fn(...args)),
    connect: jest.fn(() => options.auth(({ token }) => { socket.sentTokens.push(token) })),
    disconnect: jest.fn(),
  }
  socket.connect()
  socket.connect.mockClear()
  return socket
}

let sockets: ReturnType<typeof fakeSocket>[]
const mockIo = io as unknown as jest.Mock
const mockRefresh = refreshAccessToken as jest.Mock
const mockPending = fetchPendingOrders as jest.Mock
const mockRing = ringPendingOrder as jest.Mock
const order = { orderId: "o1", orderNumber: "BM-1", total: 1000 }

beforeEach(() => {
  jest.useFakeTimers()
  jest.clearAllMocks()
  sockets = []
  mockPending.mockReset().mockResolvedValue({ orders: [], serverNow: null })
  mockRing.mockReset().mockReturnValue(true)
  mockIo.mockImplementation((_url: string, options: Options) => {
    const s = fakeSocket(options)
    sockets.push(s)
    return s
  })
})
afterEach(() => jest.useRealTimers())

const settle = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve() }) }

it("a new access token neither reconnects nor stops the alarm", () => {
  const { rerender } = renderHook(({ t }) => useRestaurantSocket(t), { initialProps: { t: "t1" } })
  sockets[0].emit("order.new", order)
  rerender({ t: "t2" })
  rerender({ t: "t3" })
  expect(mockIo).toHaveBeenCalledTimes(1)
  expect(sockets[0].disconnect).not.toHaveBeenCalled()
  expect(stopOrderAlarm).not.toHaveBeenCalled()
})

it("leaving the panel disconnects and silences the alarm without marking orders handled", () => {
  const { unmount } = renderHook(() => useRestaurantSocket("t1"))
  unmount()
  expect(sockets[0].disconnect).toHaveBeenCalledTimes(1)
  expect(leaveOrderAlarm).toHaveBeenCalledTimes(1)
  expect(stopOrderAlarm).not.toHaveBeenCalled()
})

it("a new access token does not leave the alarm either", () => {
  const { rerender } = renderHook(({ t }) => useRestaurantSocket(t), { initialProps: { t: "t1" } })
  rerender({ t: "t2" })
  expect(leaveOrderAlarm).not.toHaveBeenCalled()
})

it("refreshes the page on every reconnect, even right after a throttled refresh", () => {
  renderHook(() => useRestaurantSocket("t1"))
  sockets[0].emit("connect")
  expect(refresh).not.toHaveBeenCalled() // the page has just been rendered
  sockets[0].emit("order.new", order)
  expect(refresh).toHaveBeenCalledTimes(1)
  sockets[0].emit("order.new", { ...order, orderId: "o2" }) // throttled
  expect(refresh).toHaveBeenCalledTimes(1)
  sockets[0].emit("disconnect", "transport close")
  sockets[0].emit("connect")
  expect(refresh).toHaveBeenCalledTimes(2)
})

describe("catching up", () => {
  const pending = [
    { id: "a", orderNumber: "BM-a", acceptDeadline: "2026-11-24T10:00:00Z" },
    { id: "b", orderNumber: "BM-b", acceptDeadline: null },
  ]
  const tick = async (ms: number) => { await act(async () => { jest.advanceTimersByTime(ms) }); await settle() }

  it("rings what is unanswered on the first connection and on every later one", async () => {
    mockPending.mockResolvedValue({ orders: pending, serverNow: 123 })
    renderHook(() => useRestaurantSocket("t1"))
    sockets[0].emit("connect")
    await settle()
    expect(mockPending).toHaveBeenCalledWith("t1")
    expect(mockRing.mock.calls).toEqual([["a", "2026-11-24T10:00:00Z", 123], ["b", null, 123]])
    sockets[0].emit("connect")
    await settle()
    expect(mockPending).toHaveBeenCalledTimes(2)
  })

  it("announces only the orders that really start to ring", async () => {
    mockPending.mockResolvedValue({ orders: pending, serverNow: 123 })
    mockRing.mockImplementation((id: string) => id === "a")
    renderHook(() => useRestaurantSocket("t1"))
    sockets[0].emit("connect")
    await settle()
    expect((toast.info as jest.Mock).mock.calls.map(([title]) => title)).toEqual(["Javob kutayotgan buyurtma: BM-a"])
  })

  it("tries again when the list cannot be fetched, but not forever", async () => {
    mockPending.mockResolvedValueOnce(null).mockResolvedValueOnce({ orders: pending, serverNow: 123 })
    renderHook(() => useRestaurantSocket("t1"))
    sockets[0].emit("connect")
    await settle()
    expect(mockRing).not.toHaveBeenCalled()
    await tick(5_000)
    expect(mockRing).toHaveBeenCalledTimes(2)
    mockPending.mockReset().mockResolvedValue(null)
    sockets[0].emit("connect")
    for (let i = 0; i < 10; i++) await tick(5_000)
    expect(mockPending).toHaveBeenCalledTimes(3)
  })

  it("leaves the retry to the next connection once the socket is gone", async () => {
    mockPending.mockResolvedValue(null)
    renderHook(() => useRestaurantSocket("t1"))
    sockets[0].emit("connect")
    await settle()
    sockets[0].connected = false
    for (let i = 0; i < 3; i++) await tick(5_000)
    expect(mockPending).toHaveBeenCalledTimes(1)
  })

  describe("with a token that has already expired", () => {
    const jwt = (exp: number) => `h.${btoa(JSON.stringify({ exp }))}.s`
    const expired = jwt(Math.floor(Date.now() / 1000) - 60)
    const fresh = jwt(Math.floor(Date.now() / 1000) + 3600)

    it("leaves it to the connection with the refreshed token", async () => {
      mockRefresh.mockResolvedValue(fresh)
      renderHook(() => useRestaurantSocket(expired))
      sockets[0].emit("connect") // an earlier, healthy life of the same socket
      await tick(3_000)
      mockPending.mockClear()
      refresh.mockClear()
      sockets[0].emit("connect")
      await settle()
      expect(mockPending).not.toHaveBeenCalled()
      expect(refresh).not.toHaveBeenCalled()
      sockets[0].emit("disconnect", "io server disconnect")
      await settle()
      sockets[0].emit("connect")
      await settle()
      expect(mockPending.mock.calls).toEqual([[fresh]])
      expect(refresh).toHaveBeenCalledTimes(1)
      await tick(60_000)
      expect(mockPending).toHaveBeenCalledTimes(1)
      expect(refresh).toHaveBeenCalledTimes(1)
    })

    it("catches up anyway if the server keeps the connection (wrong device clock)", async () => {
      renderHook(() => useRestaurantSocket(expired))
      sockets[0].emit("connect")
      await tick(2_900)
      expect(mockPending).not.toHaveBeenCalled()
      await tick(200)
      expect(mockPending).toHaveBeenCalledWith(expired)
    })

    it.each(["gone", "unmounted"])("does nothing if the socket is %s by then", async (what) => {
      const { unmount } = renderHook(() => useRestaurantSocket(expired))
      sockets[0].emit("connect")
      if (what === "gone") sockets[0].connected = false
      else unmount()
      await tick(60_000)
      expect(mockPending).not.toHaveBeenCalled()
    })
  })

  it("does nothing after unmount", async () => {
    let resolve: (o: unknown) => void = () => {}
    mockPending.mockReturnValue(new Promise((r) => { resolve = r }))
    const { unmount } = renderHook(() => useRestaurantSocket("t1"))
    sockets[0].emit("connect")
    unmount()
    resolve({ orders: pending, serverNow: 123 })
    await settle()
    expect(mockRing).not.toHaveBeenCalled()
  })
})

it("rings with the repeating alarm", () => {
  renderHook(() => useRestaurantSocket("t1"))
  sockets[0].emit("order.new", order)
  expect(playOrderAlarm).toHaveBeenCalledWith("o1")
})

it("stops that order's alarm when the server says it has moved on", () => {
  renderHook(() => useRestaurantSocket("t1"))
  sockets[0].emit("order.status.updated", { orderId: "o1", status: "pending" })
  expect(stopOrderAlarm).not.toHaveBeenCalled()
  sockets[0].emit("order.status.updated", { orderId: "o1", status: "accepted" })
  expect(stopOrderAlarm).toHaveBeenCalledWith("o1")
})

it("never limits the number of reconnection attempts", () => {
  renderHook(() => useRestaurantSocket("t1"))
  const options = mockIo.mock.calls[0][1] as Options
  expect(options.reconnectionAttempts).toBeUndefined()
  expect(options.reconnection).toBeUndefined()
})

it("leaves network errors to socket.io's own retry", async () => {
  renderHook(() => useRestaurantSocket("t1"))
  for (let i = 0; i < 50; i++) sockets[0].emit("connect_error", new Error("websocket error"))
  await settle()
  expect(mockIo).toHaveBeenCalledTimes(1)
  expect(sockets[0].connect).not.toHaveBeenCalled()
  expect(mockRefresh).not.toHaveBeenCalled()
})

it("after a server disconnect refreshes the token and reuses the same socket", async () => {
  mockRefresh.mockResolvedValue("t2")
  renderHook(() => useRestaurantSocket("t1"))
  sockets[0].emit("disconnect", "io server disconnect")
  await settle()
  expect(mockRefresh).toHaveBeenCalledTimes(1)
  expect(mockIo).toHaveBeenCalledTimes(1)
  expect(sockets[0].connect).toHaveBeenCalledTimes(1)
  expect(sockets[0].sentTokens).toEqual(["t1", "t2"])
})

it("runs one reconnect at a time", async () => {
  mockRefresh.mockResolvedValue("t2")
  renderHook(() => useRestaurantSocket("t1"))
  sockets[0].active = false
  sockets[0].emit("disconnect", "io server disconnect")
  sockets[0].emit("connect_error", new Error("auth"))
  sockets[0].emit("disconnect", "io server disconnect")
  await settle()
  await act(async () => { jest.advanceTimersByTime(60_000) })
  await settle()
  expect(mockRefresh).toHaveBeenCalledTimes(1)
  expect(sockets[0].connect).toHaveBeenCalledTimes(1)
})

it.each([
  ["an auth message", new Error("Unauthorized: auth failed")],
  ["status 401", Object.assign(new Error("refused"), { data: { statusCode: 401 } })],
])("a connection refused with %s is retried with a new token", async (_, err) => {
  mockRefresh.mockResolvedValue("t2")
  renderHook(() => useRestaurantSocket("t1"))
  sockets[0].active = false
  sockets[0].emit("connect_error", err)
  await settle()
  expect(mockRefresh).toHaveBeenCalledTimes(1)
  expect(sockets[0].sentTokens).toEqual(["t1", "t2"])
})

it("a connection refused for another reason is retried with the same token", async () => {
  renderHook(() => useRestaurantSocket("t1"))
  sockets[0].active = false
  sockets[0].emit("connect_error", new Error("server busy"))
  await settle()
  expect(mockRefresh).not.toHaveBeenCalled()
  expect(sockets[0].sentTokens).toEqual(["t1", "t1"])
})

it("uses a token the server render already rotated instead of rotating again", async () => {
  const { rerender } = renderHook(({ t }) => useRestaurantSocket(t), { initialProps: { t: "t1" } })
  rerender({ t: "t2" })
  sockets[0].emit("disconnect", "io server disconnect")
  await settle()
  expect(mockRefresh).not.toHaveBeenCalled()
  expect(sockets[0].sentTokens).toEqual(["t1", "t2"])
})

describe("a server that keeps dropping the connection", () => {
  /** Connects and is dropped again at once; resolves to the ms until the next attempt. */
  const dropAndMeasure = async () => {
    const before = sockets[0].connect.mock.calls.length
    sockets[0].emit("connect")
    sockets[0].emit("disconnect", "io server disconnect")
    await settle()
    for (let ms = 0; ms <= 120_000; ms += 1000) {
      if (sockets[0].connect.mock.calls.length > before) return ms
      await act(async () => { jest.advanceTimersByTime(1000) })
      await settle()
    }
    return Infinity
  }
  let n = 1
  beforeEach(() => { mockRefresh.mockImplementation(() => Promise.resolve(`new${n++}`)) })

  it("is retried ever more slowly, but at least every 30 s", async () => {
    renderHook(() => useRestaurantSocket("t1"))
    const delays: number[] = []
    for (let i = 0; i < 9; i++) delays.push(await dropAndMeasure())
    expect(delays).toEqual([0, 1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000])
  })

  it("is forgiven once a connection has lived for 10 s", async () => {
    renderHook(() => useRestaurantSocket("t1"))
    for (let i = 0; i < 4; i++) await dropAndMeasure()
    sockets[0].emit("connect")
    jest.advanceTimersByTime(10_000)
    const before = sockets[0].connect.mock.calls.length
    sockets[0].emit("disconnect", "io server disconnect")
    await settle()
    expect(sockets[0].connect.mock.calls.length).toBe(before + 1)
    expect(await dropAndMeasure()).toBe(0)
  })

  it("is left alone after unmount, also while waiting for the next attempt", async () => {
    const { unmount } = renderHook(() => useRestaurantSocket("t1"))
    await dropAndMeasure()
    const set = jest.spyOn(globalThis, "setTimeout")
    const clear = jest.spyOn(globalThis, "clearTimeout")
    sockets[0].emit("connect")
    sockets[0].emit("disconnect", "io server disconnect")
    await settle()
    const retry = set.mock.results[set.mock.calls.findIndex(([, ms]) => ms === 1000)].value
    const before = sockets[0].connect.mock.calls.length
    unmount()
    expect(clear).toHaveBeenCalledWith(retry)
    await act(async () => { jest.advanceTimersByTime(60_000) })
    expect(sockets[0].connect.mock.calls.length).toBe(before)
  })
})

it("does not reconnect once unmounted while a refresh was in flight", async () => {
  let resolve: (t: string) => void = () => {}
  mockRefresh.mockReturnValue(new Promise((r) => { resolve = r }))
  const { unmount } = renderHook(() => useRestaurantSocket("t1"))
  sockets[0].emit("disconnect", "io server disconnect")
  unmount()
  resolve("t2")
  await settle()
  expect(sockets[0].connect).not.toHaveBeenCalled()
})

it("\"Ko'rish\" on the toast silences that order only", () => {
  renderHook(() => useRestaurantSocket("t1"))
  sockets[0].emit("order.new", order)
  const options = (toast.info as jest.Mock).mock.calls[0][1]
  options.action.onClick()
  expect(stopOrderAlarm).toHaveBeenCalledTimes(1)
  expect(stopOrderAlarm).toHaveBeenCalledWith("o1")
})
