import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import {
  createConnectionAction,
  getConnectionAction,
  getCategoryMapsAction,
  getConnectionStatusAction,
  listRunsAction,
  requestFullSyncAction,
  rotateSecretAction,
  updateConnectionAction,
} from "@/lib/actions/integrations"
import { ConnectionCard } from "./ConnectionCard"
import { installPointerEventPolyfill, makeConnection, makeStatus } from "./fixtures"

installPointerEventPolyfill()

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }))

jest.mock("@/lib/actions/integrations", () => ({
  getConnectionAction: jest.fn(),
  createConnectionAction: jest.fn(),
  updateConnectionAction: jest.fn(),
  rotateSecretAction: jest.fn(),
  getConnectionStatusAction: jest.fn(),
  requestFullSyncAction: jest.fn(),
  listRunsAction: jest.fn(),
  getRunAction: jest.fn(),
  getCategoryMapsAction: jest.fn(),
  putCategoryMapAction: jest.fn(),
}))
jest.mock("@/lib/actions/products", () => ({ updateMenuCategoryAction: jest.fn() }))

const mocked = {
  get: getConnectionAction as jest.MockedFunction<typeof getConnectionAction>,
  create: createConnectionAction as jest.MockedFunction<typeof createConnectionAction>,
  update: updateConnectionAction as jest.MockedFunction<typeof updateConnectionAction>,
  rotate: rotateSecretAction as jest.MockedFunction<typeof rotateSecretAction>,
  status: getConnectionStatusAction as jest.MockedFunction<typeof getConnectionStatusAction>,
  fullSync: requestFullSyncAction as jest.MockedFunction<typeof requestFullSyncAction>,
  runs: listRunsAction as jest.MockedFunction<typeof listRunsAction>,
  categories: getCategoryMapsAction as jest.MockedFunction<typeof getCategoryMapsAction>,
}

const SECRET = "Xy9SecretSecretSecretSecretSecretSecret12"
const ENDPOINT = "https://api.beshmarket.uz/api/v1/integrations/1c/json"

beforeEach(() => {
  jest.clearAllMocks()
  mocked.status.mockResolvedValue({ success: true, data: makeStatus() })
})

describe("ConnectionCard: no connection", () => {
  it("creates a connection and shows the secret once; closing removes it from the page", async () => {
    const user = userEvent.setup()
    const conn = makeConnection()
    mocked.create.mockResolvedValue({
      success: true,
      data: { connection: conn, credentials: { login: conn.login, secret: SECRET, endpoint_url: ENDPOINT } },
    })
    render(<ConnectionCard restaurantId="rest1" initialConnection={null} initialStatus={null} />)

    await user.click(screen.getByRole("button", { name: /Ulanish yaratish/ }))

    expect(mocked.create).toHaveBeenCalledWith("rest1", "json")
    expect(await screen.findByText(SECRET)).toBeInTheDocument()
    expect(within(screen.getByRole("dialog")).getByText(ENDPOINT)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Saqlab oldim, yopish" }))
    await waitFor(() => expect(document.body.innerHTML).not.toContain(SECRET))
    // The connected view is shown, with the login but no secret.
    expect(screen.getAllByText(conn.login).length).toBeGreaterThan(0)
    expect(mocked.status).toHaveBeenCalledWith(conn._id)
  })

  it("on 409 shows the error and loads the existing connection instead", async () => {
    const user = userEvent.setup()
    mocked.create.mockResolvedValue({ success: false, error: "Ulanish allaqachon mavjud", status: 409 })
    mocked.get.mockResolvedValue({ success: true, data: makeConnection({ login: "bm_existing_000001" }) })
    render(<ConnectionCard restaurantId="rest1" initialConnection={null} initialStatus={null} />)

    await user.click(screen.getByRole("button", { name: /Ulanish yaratish/ }))

    expect(toast.error).toHaveBeenCalledWith("Ulanish allaqachon mavjud")
    expect((await screen.findAllByText("bm_existing_000001")).length).toBeGreaterThan(0)
    expect(screen.queryByRole("button", { name: "Saqlab oldim, yopish" })).not.toBeInTheDocument()
  })
})

describe("ConnectionCard: connected", () => {
  it("rotating needs a confirm, then shows the new secret once", async () => {
    const user = userEvent.setup()
    mocked.rotate.mockResolvedValue({
      success: true,
      data: { login: "bm_semya_a1b2c3", secret: SECRET, endpoint_url: ENDPOINT },
    })
    render(<ConnectionCard restaurantId="rest1" initialConnection={makeConnection()} initialStatus={makeStatus()} />)

    await user.click(screen.getByRole("button", { name: /Parolni almashtirish/ }))
    const confirm = await screen.findByRole("dialog")
    expect(confirm).toHaveTextContent("Eski parol darhol ishlamay qoladi")
    expect(mocked.rotate).not.toHaveBeenCalled()

    await user.click(within(confirm).getByRole("button", { name: "Almashtirish" }))
    expect(mocked.rotate).toHaveBeenCalledWith("conn1")
    expect(await screen.findByText(SECRET)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Saqlab oldim, yopish" }))
    await waitFor(() => expect(document.body.innerHTML).not.toContain(SECRET))
  })

  it("a failed rotate shows the server text and no dialog", async () => {
    const user = userEvent.setup()
    mocked.rotate.mockResolvedValue({ success: false, error: "Ruxsat yo'q", status: 403 })
    render(<ConnectionCard restaurantId="rest1" initialConnection={makeConnection()} initialStatus={makeStatus()} />)

    await user.click(screen.getByRole("button", { name: /Parolni almashtirish/ }))
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Almashtirish" }))

    expect(toast.error).toHaveBeenCalledWith("Ruxsat yo'q")
    expect(screen.queryByRole("button", { name: "Saqlab oldim, yopish" })).not.toBeInTheDocument()
  })

  it("turning the connection off asks first; turning on does not", async () => {
    const user = userEvent.setup()
    mocked.update.mockImplementation(async (_id, patch) => ({
      success: true,
      data: makeConnection({ enabled: patch.enabled }),
    }))
    render(<ConnectionCard restaurantId="rest1" initialConnection={makeConnection()} initialStatus={makeStatus()} />)

    await user.click(screen.getByRole("switch", { name: "Ulanishni yoqish" }))
    expect(mocked.update).not.toHaveBeenCalled()
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "O'chirish" }))
    expect(mocked.update).toHaveBeenCalledWith("conn1", { enabled: false })
    expect(await screen.findByText("O'chirilgan")).toBeInTheDocument()
    // The switch is disabled while the first save is in flight; wait for it.
    await waitFor(() => expect(screen.getByRole("switch", { name: "Ulanishni yoqish" })).not.toHaveAttribute("data-disabled"))

    await user.click(screen.getByRole("switch", { name: "Ulanishni yoqish" }))
    await waitFor(() => expect(mocked.update).toHaveBeenLastCalledWith("conn1", { enabled: true }))
  })

  it("shows the status panel: counts, hidden reasons and stale badge", () => {
    render(
      <ConnectionCard
        restaurantId="rest1"
        initialConnection={makeConnection()}
        initialStatus={makeStatus({ stale: true, connection: makeConnection({ last_error: { at: "2026-11-14T08:00:00.000Z", message: "Bad batch" } }) })}
      />,
    )
    expect(screen.getByText("Sinxronlash kechikmoqda")).toBeInTheDocument()
    expect(screen.getByText("1C da yo'q: 12")).toBeInTheDocument()
    expect(screen.getByText("Tarozi mahsuloti: 8")).toBeInTheDocument()
    expect(screen.getByText("Bad batch")).toBeInTheDocument()
    expect(screen.getByText("20")).toBeInTheDocument() // hidden = 120 - 100
  })
})

describe("ConnectionCard: rev 2", () => {
  it("requests a full sync and then shows it is waiting for 1C", async () => {
    const user = userEvent.setup()
    mocked.fullSync.mockResolvedValue({
      success: true,
      data: makeConnection({ full_sync_requested_at: "2026-11-14T09:00:00.000Z" }),
    })
    render(<ConnectionCard restaurantId="rest1" initialConnection={makeConnection()} initialStatus={makeStatus()} />)

    await user.click(screen.getByRole("button", { name: /To'liq qayta yuborishni so'rash/ }))

    expect(mocked.fullSync).toHaveBeenCalledWith("conn1")
    expect(await screen.findByText("So'raldi, 1C kutilmoqda")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /To'liq qayta yuborishni so'rash/ })).not.toBeInTheDocument()
  })

  it("shows the endpoint only when the connection carries it", () => {
    const { unmount } = render(
      <ConnectionCard
        restaurantId="rest1"
        initialConnection={makeConnection({ endpoint_url: undefined })}
        initialStatus={makeStatus()}
      />,
    )
    expect(screen.queryByText(ENDPOINT)).not.toBeInTheDocument()
    unmount()
    render(
      <ConnectionCard
        restaurantId="rest1"
        initialConnection={makeConnection({ endpoint_url: ENDPOINT })}
        initialStatus={makeStatus()}
      />,
    )
    expect(screen.getByText(ENDPOINT)).toBeInTheDocument()
  })

  it("link down and a missing daily full (rev 3) are flagged in the status panel", () => {
    const conn = makeConnection({
      catalog_mode: "live",
      daily_full_at: "03:00",
      link_down_since: "2026-11-14T08:00:00.000Z",
      last_full_catalog_success_at: "2026-11-01T08:00:00.000Z",
    })
    render(<ConnectionCard restaurantId="rest1" initialConnection={conn} initialStatus={makeStatus({ connection: conn })} />)
    expect(screen.getByText("Uzilgan")).toBeInTheDocument()
    expect(screen.getByText("Bugun kelmadi")).toBeInTheDocument()
    expect(screen.getByText(/Oxirgi to'liq katalog \(har kuni 03:00\)/)).toBeInTheDocument()
  })

  it("no 'Bugun kelmadi' while catalog is not live", () => {
    const conn = makeConnection({ catalog_mode: "dry_run", last_full_catalog_success_at: null })
    render(<ConnectionCard restaurantId="rest1" initialConnection={conn} initialStatus={makeStatus({ connection: conn })} />)
    expect(screen.queryByText("Bugun kelmadi")).not.toBeInTheDocument()
  })

  it("tabs load categories / runs lazily and keep unsaved settings", async () => {
    const user = userEvent.setup()
    mocked.categories.mockResolvedValue({ success: true, data: { maps: [], menu_categories: [] } })
    mocked.runs.mockResolvedValue({ success: true, data: { data: [], pagination: { page: 1, total: 0, totalPages: 1 } } })
    render(<ConnectionCard restaurantId="rest1" initialConnection={makeConnection()} initialStatus={makeStatus()} />)
    expect(mocked.categories).not.toHaveBeenCalled()
    expect(mocked.runs).not.toHaveBeenCalled()

    const buffer = screen.getByLabelText("Qoldiq zaxirasi (dona)")
    await user.clear(buffer)
    await user.type(buffer, "9")

    await user.click(screen.getByRole("tab", { name: "Kategoriyalar" }))
    expect(await screen.findByText("1C hali guruh yubormagan.")).toBeInTheDocument()
    expect(mocked.categories).toHaveBeenCalledWith("conn1")

    await user.click(screen.getByRole("tab", { name: "Jurnal" }))
    expect(await screen.findByText(/Hali yozuv yo'q/)).toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: "Sozlamalar" }))
    expect(screen.getByLabelText("Qoldiq zaxirasi (dona)")).toHaveValue("9")
  })
})
