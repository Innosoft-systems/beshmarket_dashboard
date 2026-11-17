import { render, screen } from "@testing-library/react"
import { apiRequest } from "@/lib/api/client"
import RestaurantDetailPage from "./page"

jest.mock("@/lib/auth/session", () => ({ getAccessToken: jest.fn(async () => "token") }))
jest.mock("@/lib/api/client", () => ({ apiRequest: jest.fn() }))
jest.mock("@/components/restaurants/RestaurantDetailClient", () => ({ RestaurantDetailClient: () => null }))

const api = apiRequest as jest.MockedFunction<typeof apiRequest>

it("Mahsulotlar and 1C integratsiya are real links (no Base UI nativeButton error)", async () => {
  api.mockImplementation(async (path: string) =>
    path.startsWith("/restaurants/admin/r1") && !path.includes("wallet")
      ? ({ success: true, data: { _id: "r1", name: "Semya" } } as never)
      : ({ success: true, data: null } as never),
  )
  const err = jest.spyOn(console, "error").mockImplementation(() => {})
  render(await RestaurantDetailPage({ params: Promise.resolve({ id: "r1" }) }))

  expect(screen.getByRole("link", { name: /Mahsulotlar/ })).toHaveAttribute("href", "/restaurants/r1/products")
  expect(screen.getByRole("link", { name: /1C integratsiya/ })).toHaveAttribute("href", "/restaurants/r1/integration")
  expect(screen.queryByRole("button")).not.toBeInTheDocument()
  expect(err.mock.calls.flat().join(" ")).not.toMatch(/nativeButton/)
  err.mockRestore()
})
