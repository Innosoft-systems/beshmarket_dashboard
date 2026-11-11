import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable, PageJump, parsePageJump } from "./data-table"

/**
 * Pager and page-jump behaviour that data-table.test.tsx does not cover:
 * prev/next bounds, the indicator, opt-in jump, clamping, keyboard use.
 */

type Row = { id: number; name: string }
const columns: ColumnDef<Row>[] = [{ accessorKey: "name", header: "Nomi" }]
const rows: Row[] = [{ id: 1, name: "Birinchi" }, { id: 2, name: "Ikkinchi" }]

const setup = (props: Partial<React.ComponentProps<typeof DataTable<Row, unknown>>> = {}) => {
  const onPageChange = jest.fn()
  render(
    <DataTable
      columns={columns}
      data={rows}
      pageCount={40}
      currentPage={5}
      onPageChange={onPageChange}
      {...props}
    />,
  )
  return { onPageChange }
}

const prev = () => screen.getByRole("button", { name: "Oldingi sahifa" })
const next = () => screen.getByRole("button", { name: "Keyingi sahifa" })
const jumpInput = () => screen.getByLabelText("Sahifa raqami") as HTMLInputElement
const jumpButton = () => screen.getByRole("button", { name: "O'tish" })

describe("parsePageJump: more inputs", () => {
  it("rejects decimals, signs, exponents, hex and non-ASCII digits", () => {
    for (const raw of ["1.0", "+5", "-5", "1e2", "0x10", "٣", "5 5", "5,5"]) {
      expect(parsePageJump(raw, 40)).toBeNull()
    }
  })

  it("clamps zero to 1 and anything above the last page to the last page", () => {
    expect(parsePageJump("0", 40)).toBe(1)
    expect(parsePageJump("00", 40)).toBe(1)
    expect(parsePageJump("41", 40)).toBe(40)
    expect(parsePageJump("007", 40)).toBe(7)
  })

  it("clamps numbers beyond the safe integer range to the last page", () => {
    expect(parsePageJump("99999999999999999999999", 40)).toBe(40)
  })

  it("treats a pageCount below 1 as a single page", () => {
    expect(parsePageJump("5", 0)).toBe(1)
    expect(parsePageJump("1", 1)).toBe(1)
  })
})

describe("DataTable pager", () => {
  it("shows the page indicator and the total", () => {
    setup()
    expect(screen.getByText("5 / 40")).toBeInTheDocument()
    expect(screen.getByText("Jami sahifalar: 40")).toBeInTheDocument()
  })

  it("an empty table (pageCount 0) still reads 1 / 1 and both arrows are disabled", () => {
    setup({ data: [], pageCount: 0, currentPage: 1 })
    expect(screen.getByText("1 / 1")).toBeInTheDocument()
    expect(prev()).toBeDisabled()
    expect(next()).toBeDisabled()
    expect(screen.getByText("Ma'lumot topilmadi.")).toBeInTheDocument()
  })

  it("previous is disabled on page 1 and next on the last page", () => {
    setup({ currentPage: 1, pageCount: 3 })
    expect(prev()).toBeDisabled()
    expect(next()).toBeEnabled()
  })

  it("next is disabled on the last page", () => {
    setup({ currentPage: 3, pageCount: 3 })
    expect(prev()).toBeEnabled()
    expect(next()).toBeDisabled()
  })

  it("previous and next ask for the neighbouring pages", async () => {
    const { onPageChange } = setup({ currentPage: 5, pageCount: 40 })
    await userEvent.click(prev())
    await userEvent.click(next())
    expect(onPageChange).toHaveBeenNthCalledWith(1, 4)
    expect(onPageChange).toHaveBeenNthCalledWith(2, 6)
  })

  it("a disabled arrow never calls onPageChange", async () => {
    const { onPageChange } = setup({ currentPage: 1, pageCount: 3 })
    await userEvent.click(prev())
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it("loading disables the arrows and the jump, and shows the loading row instead of data", () => {
    setup({ isLoading: true, enablePageJump: true })
    expect(prev()).toBeDisabled()
    expect(next()).toBeDisabled()
    expect(jumpInput()).toBeDisabled()
    expect(jumpButton()).toBeDisabled()
    expect(screen.getByText("Yuklanmoqda...")).toBeInTheDocument()
    expect(screen.queryByText("Birinchi")).not.toBeInTheDocument()
  })

  it("renders the rows", () => {
    setup()
    expect(screen.getByText("Birinchi")).toBeInTheDocument()
    expect(screen.getByText("Ikkinchi")).toBeInTheDocument()
  })
})

describe("DataTable page jump (opt-in)", () => {
  it("is off by default, so other tables are unchanged", () => {
    setup()
    expect(screen.queryByLabelText("Sahifa raqami")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "O'tish" })).not.toBeInTheDocument()
  })

  it("renders after the arrows, with a divider, when enabled", () => {
    const { container } = render(
      <DataTable columns={columns} data={rows} pageCount={40} currentPage={5} onPageChange={jest.fn()} enablePageJump />,
    )
    expect(screen.getByLabelText("Sahifa raqami")).toBeInTheDocument()
    expect(container.querySelector('span[aria-hidden="true"]')).toBeInTheDocument()
    const footer = screen.getByText("5 / 40").parentElement!
    const order = Array.from(footer.querySelectorAll("button, input")).map((el) =>
      el.tagName === "INPUT" ? "input" : el.textContent?.includes("Oldingi") ? "prev" : el.textContent?.includes("Keyingi") ? "next" : "go",
    )
    expect(order).toEqual(["prev", "next", "input", "go"])
  })

  it("is not rendered, with no divider, when there is only one page (or none)", () => {
    for (const pageCount of [0, 1]) {
      const { container, unmount } = render(
        <DataTable columns={columns} data={rows} pageCount={pageCount} currentPage={1} onPageChange={jest.fn()} enablePageJump />,
      )
      expect(screen.queryByLabelText("Sahifa raqami")).not.toBeInTheDocument()
      expect(container.querySelector('span[aria-hidden="true"]')).not.toBeInTheDocument()
      unmount()
    }
  })

  it("typing 25 and pressing Enter jumps to page 25", async () => {
    const { onPageChange } = setup({ enablePageJump: true })
    await userEvent.type(jumpInput(), "25{Enter}")
    expect(onPageChange).toHaveBeenCalledTimes(1)
    expect(onPageChange).toHaveBeenCalledWith(25)
    expect(jumpInput()).toHaveValue(null)
  })

  it("clicking the button jumps too", async () => {
    const { onPageChange } = setup({ enablePageJump: true })
    await userEvent.type(jumpInput(), "12")
    await userEvent.click(jumpButton())
    expect(onPageChange).toHaveBeenCalledWith(12)
  })

  // The handler clamps (these two pass), but the input has min/max, so the browser's native
  // constraint validation blocks the submit before the handler runs: typing 999 + Enter or
  // clicking "O'tish" shows "Value must be less than or equal to 40" instead of jumping to 40.
  // user-event reproduces that. Fix would be `noValidate` on the <form> (source change, not done).
  it("a page past the end is clamped to the last page (handler level)", () => {
    const { onPageChange } = setup({ enablePageJump: true })
    fireEvent.change(jumpInput(), { target: { value: "999" } })
    fireEvent.submit(jumpInput().closest("form")!)
    expect(onPageChange).toHaveBeenCalledWith(40)
  })

  it("0 is clamped to page 1 (handler level)", () => {
    const { onPageChange } = setup({ enablePageJump: true, currentPage: 5 })
    fireEvent.change(jumpInput(), { target: { value: "0" } })
    fireEvent.submit(jumpInput().closest("form")!)
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it("typing an out-of-range number marks the input invalid for the browser", async () => {
    setup({ enablePageJump: true })
    await userEvent.type(jumpInput(), "999")
    expect(jumpInput().validity.rangeOverflow).toBe(true)
    await userEvent.clear(jumpInput())
    await userEvent.type(jumpInput(), "0")
    expect(jumpInput().validity.rangeUnderflow).toBe(true)
  })

  // A1 spec: "values are clamped". The form has noValidate, so native validation no longer blocks this.
  it("typing 999 and pressing Enter jumps to the last page", async () => {
    const { onPageChange } = setup({ enablePageJump: true })
    await userEvent.type(jumpInput(), "999{Enter}")
    expect(onPageChange).toHaveBeenCalledWith(40)
  })

  it("typing 0 and pressing Enter jumps to page 1", async () => {
    const { onPageChange } = setup({ enablePageJump: true, currentPage: 5 })
    await userEvent.type(jumpInput(), "0{Enter}")
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it("a negative or decimal number does not jump (the button stays disabled)", async () => {
    const { onPageChange } = setup({ enablePageJump: true })
    await userEvent.type(jumpInput(), "-3")
    expect(jumpButton()).toBeDisabled()
    await userEvent.clear(jumpInput())
    await userEvent.type(jumpInput(), "2.5{Enter}")
    expect(jumpButton()).toBeDisabled()
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it("Enter on empty input or on the current page does nothing", async () => {
    const { onPageChange } = setup({ enablePageJump: true, currentPage: 5 })
    await userEvent.type(jumpInput(), "{Enter}")
    await userEvent.type(jumpInput(), "5{Enter}")
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it("a jump to a clamped page equal to the current page is a no-op", () => {
    const { onPageChange } = setup({ enablePageJump: true, currentPage: 40 })
    fireEvent.change(jumpInput(), { target: { value: "999" } })
    expect(jumpButton()).toBeDisabled()
    fireEvent.submit(jumpInput().closest("form")!)
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it("exposes the bounds to assistive tech and the browser", () => {
    setup({ enablePageJump: true })
    expect(jumpInput()).toHaveAttribute("min", "1")
    expect(jumpInput()).toHaveAttribute("max", "40")
    expect(jumpInput()).toHaveAttribute("type", "number")
  })
})

describe("PageJump standalone", () => {
  it("disabled prop locks the input and the button", () => {
    render(<PageJump pageCount={10} currentPage={1} onPageChange={jest.fn()} disabled />)
    expect(jumpInput()).toBeDisabled()
    expect(jumpButton()).toBeDisabled()
  })

  it("the input keeps its text until a jump succeeds", async () => {
    const onPageChange = jest.fn()
    render(<PageJump pageCount={10} currentPage={3} onPageChange={onPageChange} />)
    await userEvent.type(jumpInput(), "3{Enter}")
    expect(jumpInput()).toHaveValue(3)
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it("lives in a form, so it never submits the page it sits in", async () => {
    render(<PageJump pageCount={10} currentPage={1} onPageChange={jest.fn()} />)
    const form = within(document.body).getByLabelText("Sahifa raqami").closest("form")
    expect(form).not.toBeNull()
  })
})
