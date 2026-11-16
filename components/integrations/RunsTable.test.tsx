import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { getRunAction, listRunsAction } from "@/lib/actions/integrations"
import type { IntegrationRun, IntegrationRunSummary, RunsPage } from "@/types/integration"
import { RunsTable } from "./RunsTable"
import { installPointerEventPolyfill } from "./fixtures"

installPointerEventPolyfill()

jest.mock("@/lib/actions/integrations", () => ({
  listRunsAction: jest.fn(),
  getRunAction: jest.fn(),
}))

const listRuns = listRunsAction as jest.MockedFunction<typeof listRunsAction>
const getRun = getRunAction as jest.MockedFunction<typeof getRunAction>

const FULL: IntegrationRunSummary = {
  _id: "run-full",
  kind: "catalog",
  sync_id: "2026-11-14-full",
  mode: "full",
  is_bucket: false,
  dry_run: true,
  status: "needs_review",
  batch_total: 4,
  batches_done: [1, 2, 3, 4],
  first_batch_at: "2026-11-14T09:00:00.000Z",
  finished_at: "2026-11-14T09:02:05.000Z",
  counters: { created: 12, deactivated: 600, rejected: 3 },
}

const BUCKET: IntegrationRunSummary = {
  _id: "run-bucket",
  kind: "offers",
  sync_id: "delta:offers:2026111409",
  mode: "delta",
  is_bucket: true,
  dry_run: false,
  status: "receiving",
  batch_total: 0,
  batches_done: [],
  first_batch_at: "2026-11-14T09:20:00.000Z",
  last_batch_at: "2026-11-14T09:55:00.000Z",
  counters: { updated: 40 },
}

const page = (data: IntegrationRunSummary[], totalPages = 1): { success: true; data: RunsPage } => ({
  success: true,
  data: { data, pagination: { page: 1, total: data.length, totalPages } },
})

beforeEach(() => {
  jest.clearAllMocks()
  listRuns.mockResolvedValue(page([FULL, BUCKET]))
})

describe("RunsTable", () => {
  it("shows full runs with badges and batches, and hourly buckets by their hour", async () => {
    render(<RunsTable connectionId="conn1" />)
    const fullRow = (await screen.findByText("12 yangi · 600 yashirildi · 3 xato")).closest("tr")!
    expect(within(fullRow).getByText("To'liq")).toBeInTheDocument()
    expect(within(fullRow).getByText("Sinov")).toBeInTheDocument()
    expect(within(fullRow).getByText("Tekshirish kerak")).toBeInTheDocument()
    expect(within(fullRow).getByText("4/4")).toBeInTheDocument()
    expect(within(fullRow).getByText("2 daq 5 son")).toBeInTheDocument()

    const bucketRow = screen.getByText("O'zgarishlar, 14:00–15:00").closest("tr")!
    expect(within(bucketRow).getByText("Narx-qoldiq")).toBeInTheDocument()
    expect(within(bucketRow).queryByText("To'liq")).not.toBeInTheDocument()
    expect(within(bucketRow).getByText("—")).toBeInTheDocument() // no batches for a bucket

    expect(listRuns).toHaveBeenCalledWith("conn1", { page: 1, limit: 20 })
  })

  it("filters To'liq / O'zgarishlar and resets to page 1", async () => {
    const user = userEvent.setup()
    listRuns.mockResolvedValue(page([FULL], 3))
    render(<RunsTable connectionId="conn1" />)
    await screen.findByText("12 yangi · 600 yashirildi · 3 xato")

    await user.click(screen.getByRole("button", { name: "Keyingi sahifa" }))
    await waitFor(() => expect(listRuns).toHaveBeenLastCalledWith("conn1", { page: 2, limit: 20 }))

    await user.click(screen.getByRole("combobox", { name: "To'liq / O'zgarishlar" }))
    await user.click(await screen.findByRole("option", { name: "O'zgarishlar" }))
    await waitFor(() => expect(listRuns).toHaveBeenLastCalledWith("conn1", { page: 1, limit: 20, mode: "delta" }))

    await user.click(screen.getByRole("combobox", { name: "Turi" }))
    await user.click(await screen.findByRole("option", { name: "Katalog" }))
    await waitFor(() =>
      expect(listRuns).toHaveBeenLastCalledWith("conn1", { page: 1, limit: 20, mode: "delta", kind: "catalog" }),
    )
  })

  it("empty and error states", async () => {
    listRuns.mockResolvedValueOnce(page([]))
    const { unmount } = render(<RunsTable connectionId="conn1" />)
    expect(await screen.findByText(/Hali yozuv yo'q/)).toBeInTheDocument()
    unmount()

    listRuns.mockResolvedValueOnce({ success: false, error: "Server xatosi" })
    render(<RunsTable connectionId="conn1" />)
    expect(await screen.findByText(/Jurnalni yuklab bo'lmadi: Server xatosi/)).toBeInTheDocument()
  })

  it("an offers bucket (kind=offers) shows as Narx-qoldiq with its hour and counters", async () => {
    listRuns.mockResolvedValueOnce(page([{ ...BUCKET, counters: { updated: 12, rejected: 1 } }]))
    render(<RunsTable connectionId="conn1" />)
    const r = (await screen.findByText("O'zgarishlar, 14:00–15:00")).closest("tr")!
    expect(within(r).getByText("Narx-qoldiq")).toBeInTheDocument()
    expect(within(r).getByText("12 yangilandi · 1 xato")).toBeInTheDocument()
  })

  it("an offers run: OFFER_IGNORED is a labelled warning and the price/stock diff is readable", async () => {
    const user = userEvent.setup()
    getRun.mockResolvedValue({
      success: true,
      data: {
        ...BUCKET,
        dry_run: true,
        errors: [
          {
            external_id: "guid-7",
            code: "OFFER_IGNORED",
            field: "prices",
            message: "Розничная цена 0 не применена: товар не продаётся бесплатно",
            batch_no: 1,
          },
        ],
        diff_sample: [
          {
            op: "update",
            external_id: "guid-8",
            name: "Кабель",
            changes: { price: { from: 30000, to: 32000 }, stock: { from: 5, to: 0 }, is_available: { from: true, to: false } },
          },
        ],
      },
    })
    render(<RunsTable connectionId="conn1" />)
    const row = (await screen.findByText("O'zgarishlar, 14:00–15:00")).closest("tr")!
    await user.click(within(row).getByRole("button", { name: "Batafsil" }))
    const sheet = await screen.findByRole("dialog")
    await within(sheet).findByText("Xatolar (1)")
    expect(within(sheet).getByText("Chakana narx 0: qo'llanmadi (mahsulot bepul sotilmaydi)")).toBeInTheDocument()
    expect(within(sheet).getByText("Ogohlantirish")).toBeInTheDocument()
    expect(within(sheet).getByText(/Ulardan 1 tasi ogohlantirish/)).toBeInTheDocument()
    const updated = within(sheet).getByRole("region", { name: "O'zgaradi (1)" })
    expect(within(updated).getByText("Qoldiq:")).toBeInTheDocument()
    expect(within(updated).getByText("Mavjud:")).toBeInTheDocument()
  })

  describe("detail sheet", () => {
    const DETAIL: IntegrationRun = {
      ...FULL,
      source_ip: "203.0.113.7",
      errors: [
        { external_id: "guid-1", code: "INVALID_FIELD", field: "price", message: "price must be > 0", batch_no: 1 },
        { external_id: "guid-2", code: "MISSING_FIELD", field: "name", message: "name is required", batch_no: 2 },
        { external_id: "guid-3", code: "INVALID_FIELD", field: "unit", message: "unit is unknown", batch_no: 2 },
      ],
      diff_sample: [
        { op: "create", external_id: "guid-10", name: "Чехол iPhone 15", changes: { price: { from: null, to: 120000 } } },
        {
          op: "update",
          external_id: "guid-11",
          name: "Кабель USB-C",
          changes: { price: { from: 30000, to: 35000 }, name_ru: { from: "Кабель", to: "Кабель USB-C" } },
        },
        { op: "deactivate", external_id: "guid-12", name: "Старый товар" },
      ],
    }

    async function openDetail() {
      const user = userEvent.setup()
      getRun.mockResolvedValue({ success: true, data: DETAIL })
      render(<RunsTable connectionId="conn1" />)
      const row = (await screen.findByText("12 yangi · 600 yashirildi · 3 xato")).closest("tr")!
      await user.click(within(row).getByRole("button", { name: "Batafsil" }))
      const sheet = await screen.findByRole("dialog")
      await within(sheet).findByText("Xatolar (3)")
      return { user, sheet }
    }

    it("explains needs_review (T8) and lists every error", async () => {
      const { sheet } = await openDetail()
      expect(getRun).toHaveBeenCalledWith("run-full")
      expect(within(sheet).getByRole("alert")).toHaveTextContent("Tekshirish kerak: mahsulotlar yashirilmadi")
      expect(within(sheet).getByText("guid-1")).toBeInTheDocument()
      expect(within(sheet).getByText("guid-2")).toBeInTheDocument()
      expect(within(sheet).getByText(/IP 203\.0\.113\.7/)).toBeInTheDocument()
    })

    it("filters errors by code", async () => {
      const { user, sheet } = await openDetail()
      await user.click(within(sheet).getByRole("combobox", { name: "Xato kodi bo'yicha" }))
      await user.click(await screen.findByRole("option", { name: "MISSING_FIELD (1)" }))
      expect(within(sheet).getByText("guid-2")).toBeInTheDocument()
      expect(within(sheet).queryByText("guid-1")).not.toBeInTheDocument()
      expect(within(sheet).queryByText("guid-3")).not.toBeInTheDocument()
    })

    it("shows the dry-run diff grouped by op with from → to", async () => {
      const { sheet } = await openDetail()
      const created = within(sheet).getByRole("region", { name: "Yangi (1)" })
      expect(within(created).getByText("Чехол iPhone 15")).toBeInTheDocument()
      const updated = within(sheet).getByRole("region", { name: "O'zgaradi (1)" })
      expect(within(updated).getByText("Nomi (ru):")).toBeInTheDocument()
      // ru-RU groups with a no-break space, which the text normalizer turns into a plain space.
      expect(within(updated).getByText(/^35\s000$/)).toBeInTheDocument()
      expect(within(sheet).getByRole("region", { name: "Yashiriladi (1)" })).toHaveTextContent("Старый товар")
      expect(within(sheet).getByText(/Sinov rejimi/)).toBeInTheDocument()
    })
  })
})
