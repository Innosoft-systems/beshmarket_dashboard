import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { getSubscriberStatsAction, type SubscriberStats } from "@/lib/actions/subscribers"
import { SubscribersClient } from "./SubscribersClient"

jest.mock("@/lib/actions/subscribers", () => ({ getSubscriberStatsAction: jest.fn() }))

// jsdom has no layout, so recharts' ResponsiveContainer would render nothing.
jest.mock("recharts", () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  const Null = () => null
  return {
    ResponsiveContainer: Pass,
    BarChart: ({ children }: { children?: React.ReactNode }) => <div data-testid="chart">{children}</div>,
    Bar: Null, CartesianGrid: Null, Legend: Null, Tooltip: Null, XAxis: Null, YAxis: Null,
  }
})

const mocked = getSubscriberStatsAction as jest.MockedFunction<typeof getSubscriberStatsAction>

/** Fake only Date so promises and timers keep working. */
function freezeDate(iso: string) {
  jest.useFakeTimers({
    now: new Date(iso),
    doNotFake: [
      "nextTick", "setImmediate", "clearImmediate", "setInterval", "clearInterval",
      "setTimeout", "clearTimeout", "queueMicrotask", "requestAnimationFrame",
      "cancelAnimationFrame", "requestIdleCallback", "cancelIdleCallback", "performance", "hrtime",
    ],
  })
}

type Totals = SubscriberStats["current"]
type Row = SubscriberStats["series"][number]
type Change = SubscriberStats["change"]

const totals = (over: Partial<Totals> = {}): Totals => ({
  active: 1200, joined: 30, churned: 5, revenue: 1250000, orders: 12,
  logged_in: 300, logged_out: 40, logged_out_now: 90, buyers: 200,
  orders_total: 15, orders_delivered: 12, orders_cancelled: 2, orders_active: 1,
  ...over,
})
const row = (over: Partial<Row> = {}): Row => ({
  period: "2026-10-01", joined: 1, churned: 0, logged_in: 2, logged_out: 0, revenue: 100, orders: 1,
  buyers: 1, orders_total: 1, orders_delivered: 1, orders_cancelled: 0,
  ...over,
})
const change = (over: Partial<Change> = {}): Change => ({
  active: 9, joined: 50, churned: -38, revenue: 25,
  logged_in: 10, logged_out: -5, buyers: 12, orders_total: 20, orders_delivered: 18, orders_cancelled: -30,
  ...over,
})
const zeroTotals = (): Totals => totals({
  active: 0, joined: 0, churned: 0, revenue: 0, orders: 0, logged_in: 0, logged_out: 0, logged_out_now: 0,
  buyers: 0, orders_total: 0, orders_delivered: 0, orders_cancelled: 0, orders_active: 0,
})
const zeroRow = (): Row => row({
  joined: 0, churned: 0, logged_in: 0, logged_out: 0, revenue: 0, orders: 0, buyers: 0,
  orders_total: 0, orders_delivered: 0, orders_cancelled: 0,
})

function stats(over: Partial<SubscriberStats> = {}): SubscriberStats {
  return {
    period: { from: "2026-10-01", to: "2026-10-31", days: 31, previous_from: "2026-08-31", previous_to: "2026-09-30", granularity: "day" },
    current: totals(),
    previous: totals({ active: 1100, joined: 20, churned: 8, revenue: 1000000, orders: 10 }),
    change: change(),
    series: [row()],
    ...over,
  }
}

const ok = (data = stats()) => ({ success: true as const, data })
const kpi = (label: string) => screen.getByText(label).closest("div.rounded-xl") as HTMLElement
const tab = (name: string) => screen.getByRole("tab", { name })

describe("SubscribersClient", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    freezeDate("2026-10-14T10:00:00Z")
    mocked.mockResolvedValue(ok())
  })
  afterEach(() => jest.useRealTimers())

  it("loads the current month by default", async () => {
    render(<SubscribersClient />)
    await waitFor(() => expect(mocked).toHaveBeenCalledTimes(1))
    expect(mocked).toHaveBeenCalledWith("2026-10-01", "2026-10-31")
    expect(tab("Joriy oy")).toHaveAttribute("aria-selected", "true")
  })

  it("switches to last month", async () => {
    render(<SubscribersClient />)
    await screen.findByText("Faol obunachilar")
    await userEvent.click(tab("O'tgan oy"))
    await waitFor(() => expect(mocked).toHaveBeenLastCalledWith("2026-09-01", "2026-09-30"))
  })

  it("loads a picked month", async () => {
    render(<SubscribersClient />)
    await screen.findByText("Faol obunachilar")
    await userEvent.click(tab("Oy tanlash"))
    fireEvent.change(screen.getByLabelText("Oy"), { target: { value: "2026-02" } })
    await waitFor(() => expect(mocked).toHaveBeenLastCalledWith("2026-02-01", "2026-02-28"))
  })

  it("loads a custom range and refuses an invalid one without fetching", async () => {
    render(<SubscribersClient />)
    await screen.findByText("Faol obunachilar")
    await userEvent.click(tab("Oraliq"))
    await waitFor(() => expect(mocked).toHaveBeenLastCalledWith("2026-10-01", "2026-10-14"))

    fireEvent.change(screen.getByLabelText("Boshlanish sanasi"), { target: { value: "2026-10-05" } })
    fireEvent.change(screen.getByLabelText("Tugash sanasi"), { target: { value: "2026-10-09" } })
    await waitFor(() => expect(mocked).toHaveBeenLastCalledWith("2026-10-05", "2026-10-09"))

    mocked.mockClear()
    fireEvent.change(screen.getByLabelText("Tugash sanasi"), { target: { value: "2026-10-01" } })
    expect(await screen.findByText(/Boshlanish sanasi tugash sanasidan keyin/)).toBeInTheDocument()
    expect(mocked).not.toHaveBeenCalled()
  })

  it("formats money in so'm with thousand separators", async () => {
    render(<SubscribersClient />)
    await screen.findByText("Faol obunachilar")
    expect(kpi("Umumiy summa")).toHaveTextContent(/1\s250\s000 so'm/)
    expect(kpi("Umumiy summa")).toHaveTextContent(/oldingi davr: 1\s000\s000 so'm/)
    expect(kpi("Faol obunachilar")).toHaveTextContent(/1\s200/)
  })

  it("colours changes, inverting churn", async () => {
    render(<SubscribersClient />)
    await screen.findByText("Faol obunachilar")
    // Joined up 50% is good; churn down 38% is also good (green, down arrow).
    expect(within(kpi("Yangi qo'shilganlar")).getByText(/50%/)).toHaveClass("text-emerald-600")
    expect(within(kpi("Hisobini o'chirganlar")).getByText(/38%/)).toHaveClass("text-emerald-600")
    expect(within(kpi("Hisobini o'chirganlar")).getByText(/38%/)).toHaveTextContent("▼")
  })

  it("shows rising churn and falling revenue in red", async () => {
    mocked.mockResolvedValue(ok(stats({ change: change({ active: -3, joined: 0, churned: 40, revenue: -10 }) })))
    render(<SubscribersClient />)
    await screen.findByText("Faol obunachilar")
    expect(within(kpi("Hisobini o'chirganlar")).getByText(/40%/)).toHaveClass("text-red-600")
    expect(within(kpi("Hisobini o'chirganlar")).getByText(/40%/)).toHaveTextContent("▲")
    expect(within(kpi("Umumiy summa")).getByText(/10%/)).toHaveClass("text-red-600")
    expect(within(kpi("Faol obunachilar")).getByText(/3%/)).toHaveClass("text-red-600")
    expect(within(kpi("Yangi qo'shilganlar")).getByText("0%")).toHaveClass("text-muted-foreground")
  })

  it("shows skeletons while loading", async () => {
    let resolve!: (v: ReturnType<typeof ok>) => void
    mocked.mockReturnValue(new Promise(r => { resolve = r }))
    const { container } = render(<SubscribersClient />)
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(screen.queryByText("Faol obunachilar")).not.toBeInTheDocument()
    await act(async () => resolve(ok()))
    expect(await screen.findByText("Faol obunachilar")).toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeInTheDocument()
  })

  it("shows the empty state when the period has no data", async () => {
    mocked.mockResolvedValue(ok(stats({ current: zeroTotals(), series: [zeroRow()] })))
    render(<SubscribersClient />)
    expect(await screen.findByText("Bu davrda ma'lumot yo'q")).toBeInTheDocument()
    expect(screen.queryByTestId("chart")).not.toBeInTheDocument()
  })

  it("renders all four charts when there is data", async () => {
    render(<SubscribersClient />)
    await screen.findByText("Faol obunachilar")
    expect(screen.getAllByTestId("chart")).toHaveLength(4)
  })

  it("shows app login, buyer and order outcome KPIs", async () => {
    render(<SubscribersClient />)
    await screen.findByText("Faol obunachilar")
    expect(within(kpi("Ilovaga kirganlar")).getByText("300")).toBeInTheDocument()
    expect(within(kpi("Ilovadan chiqqanlar")).getByText("40")).toBeInTheDocument()
    expect(within(kpi("Hozir tizimdan chiqib turganlar")).getByText("90")).toBeInTheDocument()
    expect(within(kpi("Buyurtma berganlar")).getByText("200")).toBeInTheDocument()
    // 200 of 1200 active customers ordered.
    expect(within(kpi("Buyurtma berganlar")).getByText(/17%/)).toBeInTheDocument()
    expect(within(kpi("Jami buyurtmalar")).getByText("15")).toBeInTheDocument()
    expect(within(kpi("Muvaffaqiyatli (yetkazilgan)")).getByText("12")).toBeInTheDocument()
    expect(within(kpi("Bekor qilingan")).getByText("2")).toBeInTheDocument()
    // Cancellations going down is good.
    expect(within(kpi("Bekor qilingan")).getByText(/30%/)).toHaveClass("text-emerald-600")
  })

  it("loads the last 7 days on the week tab", async () => {
    render(<SubscribersClient />)
    await waitFor(() => expect(mocked).toHaveBeenCalledTimes(1))
    await userEvent.click(tab("Oxirgi 7 kun"))
    await waitFor(() => expect(mocked).toHaveBeenCalledTimes(2))
    expect(mocked).toHaveBeenLastCalledWith("2026-10-08", "2026-10-14")
  })

  it("shows the error and recovers on retry", async () => {
    mocked.mockResolvedValueOnce({ success: false, error: "Server xatosi" })
    render(<SubscribersClient />)
    expect(await screen.findByText(/Server xatosi/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /Qayta urinish/ }))
    expect(await screen.findByText("Faol obunachilar")).toBeInTheDocument()
    expect(screen.queryByText(/Server xatosi/)).not.toBeInTheDocument()
    expect(mocked).toHaveBeenCalledTimes(2)
  })

  it("ignores a slow response that was superseded by a newer request", async () => {
    let first!: (v: ReturnType<typeof ok>) => void
    mocked.mockReturnValueOnce(new Promise(r => { first = r }))
    mocked.mockResolvedValueOnce(ok(stats({ current: totals({ active: 777 }) })))
    render(<SubscribersClient />)
    await userEvent.click(tab("O'tgan oy"))
    expect(await screen.findByText("777")).toBeInTheDocument()
    await act(async () => first(ok()))
    expect(screen.getByText("777")).toBeInTheDocument()
    expect(screen.queryByText(/^1\s200$/)).not.toBeInTheDocument()
  })
})
