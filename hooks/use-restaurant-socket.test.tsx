import { renderHook } from "@testing-library/react"
import { io } from "socket.io-client"
import { playOrderAlarm } from "@/lib/order-alarm"
import { useRestaurantSocket } from "./use-restaurant-socket"

const refresh = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: jest.fn() }) }))
jest.mock("sonner", () => ({ toast: { info: jest.fn() } }))
jest.mock("@/lib/auth/refresh-client", () => ({ refreshAccessToken: jest.fn() }))
jest.mock("@/lib/order-alarm", () => ({ playOrderAlarm: jest.fn(), prewarmOrderAlarm: jest.fn(), stopOrderAlarm: jest.fn() }))

type Handler = (...args: unknown[]) => void
function fakeSocket() {
  const handlers: Record<string, Handler> = {}
  const managerHandlers: Record<string, Handler> = {}
  return {
    handlers,
    managerHandlers,
    connected: true,
    active: true,
    auth: {},
    on: jest.fn((e: string, h: Handler) => (handlers[e] = h)),
    io: { on: jest.fn((e: string, h: Handler) => (managerHandlers[e] = h)) },
    connect: jest.fn(),
    disconnect: jest.fn(),
  }
}
let sock: ReturnType<typeof fakeSocket>
jest.mock("socket.io-client", () => ({ io: jest.fn(() => sock) }))
const ioMock = io as unknown as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  sock = fakeSocket()
})

describe("useRestaurantSocket", () => {
  it("never caps reconnection attempts (it used to give up after 5)", () => {
    renderHook(() => useRestaurantSocket("at1"))
    const opts = ioMock.mock.calls[0][1]
    expect(opts.reconnectionAttempts).toBeUndefined()
    expect(opts.auth).toEqual({ token: "at1" })
  })

  it("after a reconnect, reloads data and still rings for new orders", () => {
    renderHook(() => useRestaurantSocket("at1"))
    sock.managerHandlers.reconnect()
    expect(refresh).toHaveBeenCalledTimes(1)
    sock.handlers["order.new"]({ orderId: "o1", orderNumber: "#1", total: 1000 })
    expect(playOrderAlarm).toHaveBeenCalledWith("o1", { loop: false })
  })

  it("reconnects at once when the tab is visible or online again and socket.io has stopped", () => {
    renderHook(() => useRestaurantSocket("at1"))
    sock.connected = false
    sock.active = false
    document.dispatchEvent(new Event("visibilitychange"))
    expect(sock.connect).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new Event("online"))
    expect(sock.connect).toHaveBeenCalledTimes(2)
  })

  it("leaves a socket alone while connected or already reconnecting", () => {
    renderHook(() => useRestaurantSocket("at1"))
    window.dispatchEvent(new Event("online"))
    sock.connected = false // active: still retrying
    window.dispatchEvent(new Event("online"))
    expect(sock.connect).not.toHaveBeenCalled()
  })

  it("removes its listeners on unmount", () => {
    const { unmount } = renderHook(() => useRestaurantSocket("at1"))
    unmount()
    sock.connected = false
    sock.active = false
    window.dispatchEvent(new Event("online"))
    expect(sock.connect).not.toHaveBeenCalled()
    expect(sock.disconnect).toHaveBeenCalled()
  })
})
