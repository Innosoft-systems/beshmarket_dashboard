import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toggleRestaurantVisibilityAction, setRestaurantOpenAction } from "@/app/(dashboard)/restaurants/actions"
import { installPointerEventPolyfill } from "@/components/integrations/fixtures"
import type { Restaurant } from "@/types"
import { RestaurantsTableClient } from "./RestaurantsTableClient"

installPointerEventPolyfill()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), refresh: jest.fn(), push: jest.fn() }),
  usePathname: () => "/restaurants",
  useSearchParams: () => new URLSearchParams(),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/app/(dashboard)/restaurants/actions", () => ({
  deleteRestaurantAction: jest.fn(),
  setRestaurantOpenAction: jest.fn(),
  toggleRestaurantVisibilityAction: jest.fn(),
}))
jest.mock("@/components/restaurants/RestaurantFormDialog", () => ({ RestaurantFormDialog: () => null }))

const visibility = toggleRestaurantVisibilityAction as jest.MockedFunction<typeof toggleRestaurantVisibilityAction>
const setOpen = setRestaurantOpenAction as jest.MockedFunction<typeof setRestaurantOpenAction>

const venue = (over: Partial<Restaurant>): Restaurant =>
  ({ _id: "r1", name: "Semya", type: "restaurant", city: "Toshkent", district: "Chilonzor", is_active: true, is_open: true, ...over }) as Restaurant

async function openMenu(rowName: string) {
  const user = userEvent.setup()
  const row = screen.getByText(rowName).closest("tr")!
  await user.click(within(row).getByRole("button", { name: "Amallar" }))
  return user
}

beforeEach(() => jest.clearAllMocks())

describe("RestaurantsTableClient: hiding a venue", () => {
  it("a restaurant gets both 'Mijozlardan yashirish' and 'Yopish'", async () => {
    render(<RestaurantsTableClient initialData={[venue({})]} totalPages={1} currentPage={1} />)
    await openMenu("Semya")
    expect(await screen.findByRole("menuitem", { name: /Mijozlardan yashirish/ })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: /Yopish/ })).toBeInTheDocument()
  })

  it("a market keeps 'Mijozlardan yashirish' only", async () => {
    render(<RestaurantsTableClient initialData={[venue({ name: "Korzinka", type: "market" })]} totalPages={1} currentPage={1} />)
    await openMenu("Korzinka")
    expect(await screen.findByRole("menuitem", { name: /Mijozlardan yashirish/ })).toBeInTheDocument()
    expect(screen.queryByRole("menuitem", { name: /Yopish|Ochish/ })).not.toBeInTheDocument()
  })

  it("hiding a restaurant asks first, explains orders stop, and calls the visibility action", async () => {
    visibility.mockResolvedValue({ success: true })
    render(<RestaurantsTableClient initialData={[venue({})]} totalPages={1} currentPage={1} />)
    const user = await openMenu("Semya")
    await user.click(await screen.findByRole("menuitem", { name: /Mijozlardan yashirish/ }))
    const dialog = await screen.findByRole("alertdialog").catch(() => screen.findByRole("dialog"))
    expect(dialog).toHaveTextContent("yangi buyurtma qabul qilinmaydi")
    await user.click(within(dialog).getByRole("button", { name: "Tasdiqlash" }))
    await waitFor(() => expect(visibility).toHaveBeenCalledWith("r1"))
    expect(setOpen).not.toHaveBeenCalled()
  })

  it("a hidden restaurant shows 'Yashirin' and offers 'Mijozlarga ko'rsatish'", async () => {
    render(<RestaurantsTableClient initialData={[venue({ is_active: false })]} totalPages={1} currentPage={1} />)
    const row = screen.getByText("Semya").closest("tr")!
    expect(within(row).getByText("Yashirin")).toBeInTheDocument()
    await openMenu("Semya")
    expect(await screen.findByRole("menuitem", { name: /Mijozlarga ko'rsatish/ })).toBeInTheDocument()
  })
})
