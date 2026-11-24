/** @jest-environment node */
import { fetchPendingOrders } from "./pending-orders"

const fetchMock = jest.fn()
beforeEach(() => {
  fetchMock.mockReset()
  global.fetch = fetchMock
})
const answer = (body: unknown, ok = true) => fetchMock.mockResolvedValue({ ok, json: async () => body })

it("reads the API's paginated envelope and keeps pending orders only", async () => {
  answer({ success: true, timestamp: "2026-11-24T09:59:00.000Z", data: { data: [
    { _id: "a", order_number: "BM-a", status: "pending", restaurant_accept_deadline: "2026-11-24T10:00:00Z" },
    { _id: "b", order_number: "BM-b", status: "pending" },
    { _id: "c", order_number: "BM-c", status: "accepted", restaurant_accept_deadline: "2026-11-24T10:00:00Z" },
  ] } })
  await expect(fetchPendingOrders("tok")).resolves.toEqual({
    orders: [
      { id: "a", orderNumber: "BM-a", acceptDeadline: "2026-11-24T10:00:00Z" },
      { id: "b", orderNumber: "BM-b", acceptDeadline: null },
    ],
    serverNow: Date.parse("2026-11-24T09:59:00.000Z"),
  })
  const [url, options] = fetchMock.mock.calls[0]
  expect(url).toMatch(/\/api\/v1\/orders\?status=pending/)
  expect(options.headers.Authorization).toBe("Bearer tok")
})

it.each([
  ["an error status", () => answer({}, false)],
  ["an unexpected body", () => answer({ data: null })],
  ["a network failure", () => fetchMock.mockRejectedValue(new TypeError("failed"))],
])("is null, not empty, after %s", async (_, arrange) => {
  arrange()
  await expect(fetchPendingOrders("tok")).resolves.toBeNull()
})

it.each([undefined, null, "soon", 5])("has no server time when the envelope says %p", async (timestamp) => {
  answer({ timestamp, data: { data: [] } })
  await expect(fetchPendingOrders("tok")).resolves.toEqual({ orders: [], serverNow: null })
})
