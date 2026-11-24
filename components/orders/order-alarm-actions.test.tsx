/** @jest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { updateOrderStatusAction } from "@/lib/actions/orders"
import { stopOrderAlarm } from "@/lib/order-alarm"
import type { Order } from "@/types"
import { OrdersTableClient } from "./OrdersTableClient"
import { TabletOrdersClient } from "./TabletOrdersClient"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/restaurant/orders",
  useSearchParams: () => new URLSearchParams(),
}))
jest.mock("@/hooks/use-order-socket", () => ({ useOrderSocket: jest.fn() }))
jest.mock("@/lib/actions/orders", () => ({
  updateOrderStatusAction: jest.fn(),
  updateKitchenStatusAction: jest.fn(),
  cancelOrderAction: jest.fn(),
}))
jest.mock("@/lib/order-alarm", () => ({ stopOrderAlarm: jest.fn() }))

const order = {
  _id: "o1", order_number: "BM-1", status: "pending", kitchen_status: "pending", items: [],
  client_id: null, restaurant_id: null, payment_status: "unpaid", subtotal: 1, delivery_fee: 0,
  service_fee: 0, discount: 0, total: 1, createdAt: new Date().toISOString(),
} as unknown as Order

const tablet = () => <TabletOrdersClient initialOrders={[order]} restaurantName="T" />
const table = (scope: "restaurant" | "admin") => (
  <OrdersTableClient initialData={[order]} totalPages={1} currentPage={1} scope={scope}
    filters={{ search: "", status: "", period: "" }} />
)
const action = updateOrderStatusAction as jest.Mock

async function acceptInTable(scope: "restaurant" | "admin") {
  render(table(scope))
  await userEvent.click(screen.getByRole("button", { name: "Amallar" }))
  await userEvent.click(await screen.findByRole("menuitem", { name: "Qabul qilish" }))
  await waitFor(() => expect(action).toHaveBeenCalled())
}

beforeEach(() => jest.clearAllMocks())

describe("tablet", () => {
  it("a failed accept leaves the alarm alone", async () => {
    action.mockResolvedValue({ success: false, error: "x" })
    render(tablet())
    await userEvent.click(screen.getByRole("button", { name: /Qabul qilish/ }))
    expect(action).toHaveBeenCalledWith("o1", "accepted")
    expect(stopOrderAlarm).not.toHaveBeenCalled()
  })

  it("a successful accept stops that order's alarm, not all", async () => {
    action.mockResolvedValue({ success: true })
    render(tablet())
    await userEvent.click(screen.getByRole("button", { name: /Qabul qilish/ }))
    await waitFor(() => expect(stopOrderAlarm).toHaveBeenCalledWith("o1"))
    expect(stopOrderAlarm).not.toHaveBeenCalledWith()
  })

  it("only the list of new orders silences everything", async () => {
    render(tablet())
    await userEvent.click(screen.getByRole("button", { name: /^Jarayonda/ }))
    expect(stopOrderAlarm).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: /^Yangi/ }))
    expect(stopOrderAlarm).toHaveBeenCalledWith()
  })

  it("an order answered elsewhere is stopped by a refresh", () => {
    const { rerender } = render(tablet())
    expect(stopOrderAlarm).not.toHaveBeenCalled()
    rerender(<TabletOrdersClient initialOrders={[{ ...order, status: "accepted" }]} restaurantName="T" />)
    expect(stopOrderAlarm).toHaveBeenCalledWith("o1")
  })
})

describe("table", () => {
  it("a failed accept leaves the alarm alone", async () => {
    action.mockResolvedValue({ success: false, error: "x" })
    await acceptInTable("restaurant")
    expect(stopOrderAlarm).not.toHaveBeenCalled()
  })

  it("a successful accept stops that order's alarm", async () => {
    action.mockResolvedValue({ success: true })
    await acceptInTable("restaurant")
    await waitFor(() => expect(stopOrderAlarm).toHaveBeenCalledWith("o1"))
  })

  it("the admin's table never touches the alarm", async () => {
    action.mockResolvedValue({ success: true })
    await acceptInTable("admin")
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    expect(stopOrderAlarm).not.toHaveBeenCalled()
  })
})
