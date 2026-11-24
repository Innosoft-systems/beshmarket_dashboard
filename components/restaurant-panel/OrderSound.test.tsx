/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { OrderSoundState } from "@/lib/order-alarm"
import { OrderSoundBanner, OrderSoundControl } from "./OrderSound"

let mockState: OrderSoundState
const mockTest = jest.fn()
const mockStop = jest.fn()
jest.mock("@/lib/order-alarm", () => ({
  ORDER_SOUND_CONTROL: "data-order-sound-control",
  subscribeOrderSound: () => () => {},
  getOrderSoundState: () => mockState,
  getInitialOrderSoundState: () => mockState,
  testOrderSound: () => mockTest(),
  stopOrderAlarm: () => mockStop(),
}))
const mockToast = { success: jest.fn(), warning: jest.fn(), error: jest.fn() }
jest.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => mockToast.success(...a),
    warning: (...a: unknown[]) => mockToast.warning(...a),
    error: (...a: unknown[]) => mockToast.error(...a),
  },
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockState = { status: "blocked", ringing: false, waiting: false, testing: false, needsPermission: false }
})

it.each([
  ["blocked", "Brauzer ovozga ruxsat bermadi"],
  ["unknown", "Ovoz ishlayotgani tasdiqlanmadi"],
  ["failed", "Ovoz fayli ochilmadi"],
] as const)("warns while sound is %s, claiming no more than is known", (status, text) => {
  mockState = { ...mockState, status }
  render(<OrderSoundBanner />)
  expect(screen.getByRole("alert")).toHaveTextContent(text)
  if (status !== "blocked") expect(screen.getByRole("alert")).not.toHaveTextContent("ruxsat bermadi")
  expect(screen.getByRole("button", { name: "Ovozni yoqish" })).toBeInTheDocument()
})

it.each(["enabled", "checking"] as const)("shows no banner while %s", (status) => {
  mockState = { ...mockState, status }
  render(<OrderSoundBanner />)
  expect(screen.queryByRole("alert")).not.toBeInTheDocument()
})

it("says what to allow when even the button was refused", () => {
  mockState = { ...mockState, needsPermission: true }
  render(<OrderSoundBanner />)
  expect(screen.getByRole("alert")).toHaveTextContent("Manzil satridagi belgini bosing")
  expect(screen.getByRole("button", { name: "Ovozni yoqish" })).toBeInTheDocument()
})

it("says that an order is waiting unheard", () => {
  mockState = { ...mockState, waiting: true }
  render(<OrderSoundBanner />)
  expect(screen.getByRole("alert")).toHaveTextContent("Yangi buyurtma keldi, lekin ovoz chalinmadi!")
})

it.each([
  ["ok", "success"],
  ["fallback", "warning"],
  ["blocked", "error"],
  ["failed", "error"],
] as const)("a test that ends '%s' shows a %s toast and no other", async (result, kind) => {
  mockTest.mockResolvedValue(result)
  render(<OrderSoundControl />)
  await userEvent.click(screen.getByRole("button", { name: /Ovozni sinash/ }))
  expect(mockToast[kind]).toHaveBeenCalledTimes(1)
  const total = Object.values(mockToast).reduce((n, f) => n + f.mock.calls.length, 0)
  expect(total).toBe(1)
})

it("offers to stop a ringing alarm", async () => {
  mockState = { ...mockState, status: "enabled", ringing: true }
  render(<OrderSoundControl />)
  await userEvent.click(screen.getByRole("button", { name: "Ovozni to'xtatish" }))
  expect(mockStop).toHaveBeenCalledTimes(1)
})

it("publishes the banner's height while it is shown", () => {
  jest.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(64)
  const root = document.documentElement.style
  const { unmount } = render(<OrderSoundBanner />)
  expect(root.getPropertyValue("--order-sound-banner")).toBe("64px")
  unmount()
  expect(root.getPropertyValue("--order-sound-banner")).toBe("")
})

it("marks the controls that play the sound themselves", () => {
  render(<><OrderSoundBanner /><OrderSoundControl /></>)
  expect(screen.getByRole("button", { name: "Ovozni yoqish" })).toHaveAttribute("data-order-sound-control")
  expect(screen.getByRole("button", { name: /Ovozni sinash/ })).toHaveAttribute("data-order-sound-control")
})
