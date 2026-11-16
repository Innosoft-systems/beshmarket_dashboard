import { render, screen, within } from "@testing-library/react"
import { NotificationsHistoryClient } from "./NotificationsHistoryClient"

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => "/notifications" }))

/** The B7 monitor / B2 alerts exactly as the backend creates them (type integration_1c, data.link). */
const ONE_C = [
  {
    _id: "n1",
    type: "integration_1c",
    title: "1C aloqasi uzildi: Semya",
    body: "30 daqiqadan beri 1C dan so'rov kelmadi.",
    data: { restaurantId: "r1", connectionId: "c1", link: "/restaurants/r1/integration" },
    is_read: false,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "n2",
    type: "integration_1c",
    title: "Bugungi to'liq katalog kelmadi: Semya",
    body: "Soat 06:00 gacha to'liq katalog kelmadi.",
    data: { restaurantId: "r1", link: "/restaurants/r1/integration" },
    is_read: true,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "n3",
    type: "integration_1c",
    title: "1C: to'liq yuklash tekshiruv talab qiladi",
    body: "To'liq yuklash 600 ta mahsulotni yashirgan bo'lardi (yarmidan ko'p). Hech narsa yashirilmadi: yuklashni tekshiring.",
    data: { restaurantId: "r1", syncId: "s1", link: "/restaurants/r1/integration" },
    is_read: true,
    createdAt: new Date().toISOString(),
  },
]

describe("NotificationsHistoryClient: 1C notifications (B7)", () => {
  it("show a 1C label and icon (not the raw type), the text, and a link to the 1C page", () => {
    render(<NotificationsHistoryClient initialData={{ data: ONE_C, total: 3, pages: 1 }} currentPage={1} />)
    expect(screen.queryByText("integration_1c")).not.toBeInTheDocument()
    expect(screen.getAllByText("1C integratsiya")).toHaveLength(3)
    expect(screen.getAllByText("🔄")).toHaveLength(3)

    const down = screen.getByText("1C aloqasi uzildi: Semya").closest("div")!.parentElement!
    expect(within(down).getByText(/30 daqiqadan beri/)).toBeInTheDocument()
    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("href", "/restaurants/r1/integration")
    }
    expect(screen.getByText("Bugungi to'liq katalog kelmadi: Semya")).toBeInTheDocument()
    expect(screen.getByText("1C: to'liq yuklash tekshiruv talab qiladi")).toBeInTheDocument()
  })
})
