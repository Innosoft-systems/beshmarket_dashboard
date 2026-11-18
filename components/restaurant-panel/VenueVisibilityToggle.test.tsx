import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { toggleMyRestaurantActiveAction } from "@/lib/actions/restaurant-panel"
import { VenueVisibilityToggle } from "./VenueVisibilityToggle"

const refresh = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/lib/actions/restaurant-panel", () => ({ toggleMyRestaurantActiveAction: jest.fn() }))
const toggle = toggleMyRestaurantActiveAction as jest.MockedFunction<typeof toggleMyRestaurantActiveAction>

beforeEach(() => jest.clearAllMocks())

describe("VenueVisibilityToggle (restaurants and markets)", () => {
  it("hides a visible venue and says new orders will not come", async () => {
    const user = userEvent.setup()
    toggle.mockResolvedValue(undefined as never)
    render(<VenueVisibilityToggle isActive />)
    const btn = screen.getByRole("button", { name: /Ilovada ko'rinmoqda: yashirish/ })
    expect(btn).toHaveTextContent("Ko'rinmoqda")
    await user.click(btn)
    expect(toggle).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Ilovadan yashirildi: yangi buyurtma kelmaydi"))
    expect(screen.getByRole("button", { name: /Ilovadan yashirilgan: ko'rsatish/ })).toHaveTextContent("Yashirilgan")
  })

  it("rolls back and shows the server's error", async () => {
    const user = userEvent.setup()
    toggle.mockResolvedValue({ success: false, error: "Server xatosi" } as never)
    render(<VenueVisibilityToggle isActive={false} />)
    await user.click(screen.getByRole("button", { name: /ko'rsatish/ }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Server xatosi"))
    expect(screen.getByRole("button")).toHaveTextContent("Yashirilgan")
  })
})
