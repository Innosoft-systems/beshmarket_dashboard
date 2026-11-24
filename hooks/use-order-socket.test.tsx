/** @jest-environment jsdom */
import { renderHook } from "@testing-library/react"
import { io } from "socket.io-client"
import { stopOrderAlarm } from "@/lib/order-alarm"
import { useOrderSocket } from "./use-order-socket"

const socket = { on: jest.fn(), disconnect: jest.fn(), connect: jest.fn() }
jest.mock("socket.io-client", () => ({ io: jest.fn() }))
jest.mock("sonner", () => ({ toast: { info: jest.fn() } }))
jest.mock("@/lib/auth/refresh-client", () => ({ refreshAccessToken: jest.fn() }))
jest.mock("@/lib/order-alarm", () => ({
  playOrderAlarm: jest.fn(),
  prewarmOrderAlarm: jest.fn(),
  stopOrderAlarm: jest.fn(),
}))

beforeEach(() => {
  jest.clearAllMocks()
  ;(io as unknown as jest.Mock).mockReturnValue(socket)
})

it("without a token (the restaurant's order list) it never touches the alarm", () => {
  const { rerender, unmount } = renderHook(() => useOrderSocket(null))
  rerender()
  unmount()
  expect(io).not.toHaveBeenCalled()
  expect(stopOrderAlarm).not.toHaveBeenCalled()
})

it("an admin screen silences its chime when it is left, but not on a token change", () => {
  const { rerender, unmount } = renderHook(({ t }) => useOrderSocket(t), { initialProps: { t: "t1" } })
  rerender({ t: "t2" })
  expect(stopOrderAlarm).not.toHaveBeenCalled()
  unmount()
  expect(stopOrderAlarm).toHaveBeenCalledTimes(1)
})
