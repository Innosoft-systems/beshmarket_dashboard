import { fireEvent, render, screen } from "@testing-library/react"
import { PageJump, parsePageJump } from "./data-table"

describe("parsePageJump", () => {
  it("clamps to 1..pageCount and rejects non-numeric input", () => {
    expect(parsePageJump("25", 40)).toBe(25)
    expect(parsePageJump(" 7 ", 40)).toBe(7)
    expect(parsePageJump("999", 40)).toBe(40)
    expect(parsePageJump("0", 40)).toBe(1)
    expect(parsePageJump("", 40)).toBeNull()
    expect(parsePageJump("abc", 40)).toBeNull()
    expect(parsePageJump("-3", 40)).toBeNull()
    expect(parsePageJump("2.5", 40)).toBeNull()
  })
})

describe("PageJump", () => {
  it("jumps on Enter and clears the input", () => {
    const onPageChange = jest.fn()
    render(<PageJump pageCount={40} currentPage={1} onPageChange={onPageChange} />)
    const input = screen.getByLabelText("Sahifa raqami")
    fireEvent.change(input, { target: { value: "25" } })
    fireEvent.submit(input.closest("form")!)
    expect(onPageChange).toHaveBeenCalledWith(25)
    expect(input).toHaveValue(null)
  })

  it("disables the button for empty input or the current page", () => {
    render(<PageJump pageCount={40} currentPage={3} onPageChange={jest.fn()} />)
    const button = screen.getByRole("button", { name: "O'tish" })
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByLabelText("Sahifa raqami"), { target: { value: "3" } })
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByLabelText("Sahifa raqami"), { target: { value: "4" } })
    expect(button).toBeEnabled()
  })

  it("is hidden when there is only one page", () => {
    const { container } = render(<PageJump pageCount={1} currentPage={1} onPageChange={jest.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
