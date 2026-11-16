import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { getCategoryMapsAction, putCategoryMapAction } from "@/lib/actions/integrations"
import { updateMenuCategoryAction } from "@/lib/actions/products"
import type { CategoriesData, CategoryMap } from "@/types/integration"
import { CategoryMappingTable } from "./CategoryMappingTable"
import { installPointerEventPolyfill } from "./fixtures"

installPointerEventPolyfill()

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/lib/actions/integrations", () => ({
  getCategoryMapsAction: jest.fn(),
  putCategoryMapAction: jest.fn(),
}))
jest.mock("@/lib/actions/products", () => ({ updateMenuCategoryAction: jest.fn() }))

const getMaps = getCategoryMapsAction as jest.MockedFunction<typeof getCategoryMapsAction>
const putMap = putCategoryMapAction as jest.MockedFunction<typeof putCategoryMapAction>
const patchCategory = updateMenuCategoryAction as jest.MockedFunction<typeof updateMenuCategoryAction>

const map = (o: Partial<CategoryMap> = {}): CategoryMap => ({
  group_id: "g-cases",
  path: ["Аксессуары", "Чехлы"],
  menu_category_id: null,
  ignored: false,
  auto: true,
  product_count: 42,
  ...o,
})

const DATA: CategoriesData = {
  maps: [map(), map({ group_id: "g-cables", path: ["Аксессуары", "Кабели"], product_count: 7 })],
  menu_categories: [
    { _id: "m-acc", name_uz: "Aksessuarlar", is_active: true, source: null },
    { _id: "m-auto", name_uz: "Аксессуары", is_active: false, source: "1c" },
  ],
}

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

async function chooseFor(path: string, option: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole("combobox", { name: `${path}: menyu kategoriyasi` }))
  await user.click(await screen.findByRole("option", { name: option }))
}

beforeEach(() => {
  jest.clearAllMocks()
  getMaps.mockResolvedValue({ success: true, data: JSON.parse(JSON.stringify(DATA)) as CategoriesData })
})

describe("CategoryMappingTable", () => {
  it("lists 1C groups with path, product count and the current choice", async () => {
    render(<CategoryMappingTable connectionId="conn1" />)
    expect(await screen.findByText("Аксессуары › Чехлы")).toBeInTheDocument()
    expect(screen.getByText("42")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Аксессуары › Чехлы: menyu kategoriyasi" })).toHaveTextContent(
      "Avtomatik",
    )
    expect(screen.getByText(/O'zgarish keyingi sinxronlashda qo'llanadi/)).toBeInTheDocument()
    expect(getMaps).toHaveBeenCalledWith("conn1")
  })

  it("maps a group optimistically and sends one PUT for that row", async () => {
    const d = deferred<Awaited<ReturnType<typeof putCategoryMapAction>>>()
    putMap.mockReturnValue(d.promise)
    render(<CategoryMappingTable connectionId="conn1" />)
    await screen.findByText("Аксессуары › Чехлы")

    await chooseFor("Аксессуары › Чехлы", "Aksessuarlar")

    // Shown before the server answers.
    const trigger = screen.getByRole("combobox", { name: "Аксессуары › Чехлы: menyu kategoriyasi" })
    expect(trigger).toHaveTextContent("Aksessuarlar")
    expect(putMap).toHaveBeenCalledTimes(1)
    expect(putMap).toHaveBeenCalledWith("conn1", "g-cases", { menu_category_id: "m-acc", ignored: false })

    d.resolve({ success: true, data: map({ menu_category_id: "m-acc", auto: false }) })
    await waitFor(() => expect(trigger).not.toBeDisabled())
    expect(trigger).toHaveTextContent("Aksessuarlar")
  })

  it("rolls the row back and shows the server text when the PUT fails", async () => {
    putMap.mockResolvedValue({ success: false, error: "Kategoriya topilmadi", status: 404 })
    render(<CategoryMappingTable connectionId="conn1" />)
    await screen.findByText("Аксессуары › Чехлы")

    await chooseFor("Аксессуары › Чехлы", "Import qilinmasin")

    expect(putMap).toHaveBeenCalledWith("conn1", "g-cases", { menu_category_id: null, ignored: true })
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Kategoriya topilmadi"))
    expect(screen.getByRole("combobox", { name: "Аксессуары › Чехлы: menyu kategoriyasi" })).toHaveTextContent(
      "Avtomatik",
    )
  })

  it("choosing the current value sends nothing", async () => {
    render(<CategoryMappingTable connectionId="conn1" />)
    await screen.findByText("Аксессуары › Чехлы")
    await chooseFor("Аксессуары › Чехлы", "Avtomatik")
    expect(putMap).not.toHaveBeenCalled()
  })

  it("filters groups by path", async () => {
    const user = userEvent.setup()
    render(<CategoryMappingTable connectionId="conn1" />)
    await screen.findByText("Аксессуары › Чехлы")
    await user.type(screen.getByLabelText("Guruh bo'yicha qidirish"), "кабел")
    expect(screen.queryByText("Аксессуары › Чехлы")).not.toBeInTheDocument()
    expect(screen.getByText("Аксессуары › Кабели")).toBeInTheDocument()
  })

  it("activates an auto-created hidden category via the category PATCH, rolling back on error", async () => {
    const user = userEvent.setup()
    patchCategory.mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ success: false, error: "Ruxsat yo'q" })
    render(<CategoryMappingTable connectionId="conn1" />)
    const toggle = await screen.findByRole("switch", { name: "Аксессуары: faollashtirish" })
    expect(toggle).not.toBeChecked()
    // Only 1C-created categories are listed here.
    expect(screen.queryByRole("switch", { name: "Aksessuarlar: faollashtirish" })).not.toBeInTheDocument()

    await user.click(toggle)
    expect(patchCategory).toHaveBeenCalledWith("m-auto", { is_active: true })
    await waitFor(() => expect(toggle).toBeChecked())
    // Its products hidden as category_inactive will appear: say so.
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/faollashtirildi\. .*yashirilgan 1C mahsulotlari endi ko'rinadi/))

    await user.click(toggle)
    expect(patchCategory).toHaveBeenLastCalledWith("m-auto", { is_active: false })
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Ruxsat yo'q"))
    expect(toggle).toBeChecked()
  })

  it("empty and error states", async () => {
    getMaps.mockResolvedValueOnce({ success: true, data: { maps: [], menu_categories: [] } })
    const { unmount } = render(<CategoryMappingTable connectionId="conn1" />)
    expect(await screen.findByText("1C hali guruh yubormagan.")).toBeInTheDocument()
    unmount()

    getMaps.mockResolvedValueOnce({ success: false, error: "Server xatosi" })
    render(<CategoryMappingTable connectionId="conn1" />)
    expect(await screen.findByText(/Server xatosi/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Qayta urinish" })).toBeInTheDocument()
  })
})
