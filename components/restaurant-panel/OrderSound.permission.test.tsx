/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { OrderSoundState } from "@/lib/order-alarm"
import { requestNotificationPermissionFromClick } from "@/hooks/use-fcm-token"
import { OrderSoundBanner, OrderSoundControl } from "./OrderSound"

const state: OrderSoundState = { status: "blocked", ringing: false, waiting: false, testing: false, needsPermission: false }
const mockTest = jest.fn(async () => "ok")
jest.mock("@/lib/order-alarm", () => ({
  ORDER_SOUND_CONTROL: "data-order-sound-control",
  subscribeOrderSound: () => () => {},
  getOrderSoundState: () => state,
  getInitialOrderSoundState: () => state,
  testOrderSound: () => mockTest(),
  stopOrderAlarm: jest.fn(),
}))
jest.mock("@/hooks/use-fcm-token", () => ({ requestNotificationPermissionFromClick: jest.fn(async () => "granted") }))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() } }))

const ask = requestNotificationPermissionFromClick as jest.Mock

beforeEach(() => jest.clearAllMocks())

describe("order sound buttons also ask for push permission (same click)", () => {
  it("banner 'Ovozni yoqish'", async () => {
    render(<OrderSoundBanner />)
    await userEvent.setup().click(screen.getByRole("button", { name: /Ovozni yoqish/ }))
    expect(ask).toHaveBeenCalledTimes(1)
    expect(mockTest).toHaveBeenCalledTimes(1)
    // Asked before the sound test, inside the gesture.
    expect(ask.mock.invocationCallOrder[0]).toBeLessThan(mockTest.mock.invocationCallOrder[0])
  })

  it("header 'Ovozni sinash'", async () => {
    render(<OrderSoundControl />)
    await userEvent.setup().click(screen.getByRole("button", { name: /Ovozni sinash/ }))
    expect(ask).toHaveBeenCalledTimes(1)
  })
})
