import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OrderPeriodFilter, type OrderPeriodValue } from "./OrderPeriodFilter"

const EMPTY: OrderPeriodValue = { period: "", month: "", date_from: "", date_to: "" }

/** Only fake Date, so promises/timers (base-ui popups) keep working. */
function freeze(iso: string) {
  jest.useFakeTimers({
    now: new Date(iso),
    doNotFake: [
      "nextTick", "setImmediate", "clearImmediate", "setInterval", "clearInterval",
      "setTimeout", "clearTimeout", "queueMicrotask", "requestAnimationFrame",
      "cancelAnimationFrame", "requestIdleCallback", "cancelIdleCallback", "performance", "hrtime",
    ],
  })
}

const setup = (value: Partial<OrderPeriodValue> = {}, extra: Partial<React.ComponentProps<typeof OrderPeriodFilter>> = {}) => {
  const onChange = jest.fn()
  const utils = render(<OrderPeriodFilter value={{ ...EMPTY, ...value }} onChange={onChange} {...extra} />)
  return { onChange, ...utils }
}

const monthInput = () => screen.getByLabelText("Oy") as HTMLInputElement
const fromInput = () => screen.getByLabelText("Boshlanish sanasi") as HTMLInputElement
const toInput = () => screen.getByLabelText("Tugash sanasi") as HTMLInputElement
const HINT = "Boshlanish sanasi tugash sanasidan keyin bo'lmasligi kerak."

afterEach(() => jest.useRealTimers())

describe("OrderPeriodFilter: what is shown", () => {
  it("empty period reads 'Barcha vaqt' and shows no extra inputs", () => {
    setup()
    expect(screen.getByRole("combobox")).toHaveTextContent("Barcha vaqt")
    expect(screen.queryByLabelText("Oy")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Boshlanish sanasi")).not.toBeInTheDocument()
  })

  it.each([
    ["today", "Bugun"],
    ["yesterday", "Kecha"],
    ["week", "Hafta"],
    ["month", "Oy"],
    ["calendar_month", "Oy tanlash"],
    ["range", "Sana oralig'i"],
  ])("period %s is labelled %s", (period, label) => {
    setup({ period })
    expect(screen.getByRole("combobox")).toHaveTextContent(label)
  })

  it("an unknown period falls back to the first label instead of crashing", () => {
    setup({ period: "bogus" })
    expect(screen.getByRole("combobox")).toHaveTextContent("Barcha vaqt")
  })

  it("fixed periods (today, week, ...) show no month or date inputs", () => {
    for (const period of ["today", "yesterday", "week", "month"]) {
      const { unmount } = setup({ period })
      expect(screen.queryByLabelText("Oy")).not.toBeInTheDocument()
      expect(screen.queryByLabelText("Boshlanish sanasi")).not.toBeInTheDocument()
      unmount()
    }
  })

  it("calendar_month shows a month input with the stored value and no date range", () => {
    setup({ period: "calendar_month", month: "2026-10" })
    expect(monthInput()).toHaveValue("2026-10")
    expect(monthInput()).toHaveAttribute("type", "month")
    expect(screen.queryByLabelText("Boshlanish sanasi")).not.toBeInTheDocument()
  })

  it("the month input cannot go past the current Tashkent month", () => {
    freeze("2026-11-08T21:00:00Z") // already Nov 9 in Tashkent
    setup({ period: "calendar_month", month: "2026-10" })
    expect(monthInput()).toHaveAttribute("max", "2026-11")
  })

  it("the month limit follows Tashkent at a month end (Oct 31 20:00Z is already Nov 1 there)", () => {
    freeze("2026-10-31T20:00:00Z")
    setup({ period: "calendar_month", month: "2026-10" })
    expect(monthInput()).toHaveAttribute("max", "2026-11")
  })

  it("range shows two date inputs with the stored values", () => {
    setup({ period: "range", date_from: "2026-10-01", date_to: "2026-10-15" })
    expect(fromInput()).toHaveValue("2026-10-01")
    expect(toInput()).toHaveValue("2026-10-15")
    expect(screen.queryByLabelText("Oy")).not.toBeInTheDocument()
  })

  it("the two dates bound each other (max on the start, min on the end)", () => {
    setup({ period: "range", date_from: "2026-10-01", date_to: "2026-10-15" })
    expect(fromInput()).toHaveAttribute("max", "2026-10-15")
    expect(toInput()).toHaveAttribute("min", "2026-10-01")
  })

  it("an open-ended range sets no bound on the empty side", () => {
    setup({ period: "range", date_from: "2026-10-01" })
    expect(fromInput()).not.toHaveAttribute("max")
    expect(toInput()).toHaveAttribute("min", "2026-10-01")
    expect(screen.queryByText(HINT)).not.toBeInTheDocument()
  })

  it("a backwards range is flagged: aria-invalid on both inputs and the hint", () => {
    setup({ period: "range", date_from: "2026-10-15", date_to: "2026-10-01" })
    expect(fromInput()).toHaveAttribute("aria-invalid", "true")
    expect(toInput()).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText(HINT)).toBeInTheDocument()
  })

  it.each([
    ["a valid range", "2026-10-01", "2026-10-15"],
    ["a single day", "2026-10-05", "2026-10-05"],
    ["only a start", "2026-10-05", ""],
    ["only an end", "", "2026-10-05"],
    ["no dates", "", ""],
  ])("%s is not flagged", (_name, date_from, date_to) => {
    setup({ period: "range", date_from, date_to })
    expect(fromInput()).not.toHaveAttribute("aria-invalid")
    expect(toInput()).not.toHaveAttribute("aria-invalid")
    expect(screen.queryByText(HINT)).not.toBeInTheDocument()
  })

  it("the hint is only for the range period, even if stale dates are left in the value", () => {
    setup({ period: "today", date_from: "2026-10-15", date_to: "2026-10-01" })
    expect(screen.queryByText(HINT)).not.toBeInTheDocument()
  })

  it("disabled locks the select and every input", () => {
    setup({ period: "range", date_from: "2026-10-01" }, { disabled: true })
    expect(screen.getByRole("combobox")).toBeDisabled()
    expect(fromInput()).toBeDisabled()
    expect(toInput()).toBeDisabled()
  })

  it("disabled also locks the month input", () => {
    setup({ period: "calendar_month", month: "2026-10" }, { disabled: true })
    expect(monthInput()).toBeDisabled()
  })
})

describe("OrderPeriodFilter: what it reports", () => {
  it("changing the month reports only { month }", () => {
    const { onChange } = setup({ period: "calendar_month", month: "2026-10" })
    fireEvent.change(monthInput(), { target: { value: "2026-09" } })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({ month: "2026-09" })
  })

  it("clearing the month reports an empty string (the caller removes the URL key)", () => {
    const { onChange } = setup({ period: "calendar_month", month: "2026-10" })
    fireEvent.change(monthInput(), { target: { value: "" } })
    expect(onChange).toHaveBeenCalledWith({ month: "" })
  })

  it("changing a date reports only that key", () => {
    const { onChange } = setup({ period: "range", date_from: "2026-10-01", date_to: "2026-10-15" })
    fireEvent.change(fromInput(), { target: { value: "2026-10-03" } })
    expect(onChange).toHaveBeenLastCalledWith({ date_from: "2026-10-03" })
    fireEvent.change(toInput(), { target: { value: "2026-10-20" } })
    expect(onChange).toHaveBeenLastCalledWith({ date_to: "2026-10-20" })
  })

  it("typing a date reports a value at a time via the controlled input", async () => {
    const { onChange } = setup({ period: "range" })
    await userEvent.type(fromInput(), "2026-10-01")
    expect(onChange).toHaveBeenCalled()
    for (const [arg] of onChange.mock.calls) expect(Object.keys(arg)).toEqual(["date_from"])
  })
})

describe("OrderPeriodFilter: picking a period", () => {
  const pick = async (label: string) => {
    await userEvent.click(screen.getByRole("combobox"))
    await userEvent.click(await screen.findByRole("option", { name: label }))
  }

  it("'Oy tanlash' filters straight away by the current Tashkent month", async () => {
    freeze("2026-11-08T21:00:00Z") // Nov 9 in Tashkent
    const { onChange } = setup({ period: "today" })
    await pick("Oy tanlash")
    expect(onChange).toHaveBeenCalledWith({ period: "calendar_month", month: "2026-11", date_from: "", date_to: "" })
  })

  it("'Oy tanlash' keeps an already chosen month", async () => {
    const { onChange } = setup({ period: "today", month: "2026-03" })
    await pick("Oy tanlash")
    expect(onChange).toHaveBeenCalledWith({ period: "calendar_month", month: "2026-03", date_from: "", date_to: "" })
  })

  it("'Sana oralig'i' keeps the typed dates and clears the month", async () => {
    const { onChange } = setup({ period: "calendar_month", month: "2026-10", date_from: "2026-10-01", date_to: "2026-10-05" })
    await pick("Sana oralig'i")
    expect(onChange).toHaveBeenCalledWith({ period: "range", month: "", date_from: "2026-10-01", date_to: "2026-10-05" })
  })

  it("a fixed period clears the month and both dates", async () => {
    const { onChange } = setup({ period: "range", month: "2026-10", date_from: "2026-10-01", date_to: "2026-10-05" })
    await pick("Hafta")
    expect(onChange).toHaveBeenCalledWith({ period: "week", month: "", date_from: "", date_to: "" })
  })

  it("'Barcha vaqt' reports period 'all' with everything else cleared", async () => {
    const { onChange } = setup({ period: "today" })
    await pick("Barcha vaqt")
    expect(onChange).toHaveBeenCalledWith({ period: "all", month: "", date_from: "", date_to: "" })
  })

  it("lists all seven options", async () => {
    setup()
    await userEvent.click(screen.getByRole("combobox"))
    const options = await screen.findAllByRole("option")
    expect(options.map((o) => o.textContent)).toEqual([
      "Barcha vaqt", "Bugun", "Kecha", "Hafta", "Oy", "Oy tanlash", "Sana oralig'i",
    ])
  })
})
