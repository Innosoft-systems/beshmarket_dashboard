import { render, waitFor } from "@testing-library/react"
import { refreshAccessToken } from "@/lib/auth/refresh-client"
import { hardNavigate } from "@/lib/auth/navigate"
import { PresenceHeartbeat } from "./PresenceHeartbeat"

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }))
jest.mock("@/lib/auth/refresh-client", () => ({ refreshAccessToken: jest.fn() }))
jest.mock("@/lib/auth/navigate", () => ({ hardNavigate: jest.fn() }))

const refresh = refreshAccessToken as jest.MockedFunction<typeof refreshAccessToken>
const navigate = hardNavigate as jest.MockedFunction<typeof hardNavigate>
const fetchMock = jest.fn()
const res = (status: number, body: unknown = {}) => ({ ok: status < 300, status, json: async () => body })

beforeAll(() => {
  // jsdom has no AbortSignal.timeout.
  if (!AbortSignal.timeout) (AbortSignal as unknown as { timeout: () => AbortSignal }).timeout = () => new AbortController().signal
})
beforeEach(() => {
  jest.clearAllMocks()
  fetchMock.mockReset()
  global.fetch = fetchMock as unknown as typeof fetch
})

describe("PresenceHeartbeat (F2)", () => {
  it("a 401 refreshes through the shared client refresh and beats again", async () => {
    fetchMock.mockResolvedValueOnce(res(401)).mockResolvedValueOnce(res(200, { is_open: true, instance: "i1" }))
    refresh.mockResolvedValue("at2")
    const { unmount } = render(<PresenceHeartbeat />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock.mock.calls.every((c) => c[0] === "/restaurant/presence")).toBe(true)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(navigate).not.toHaveBeenCalled()
    unmount()
  })

  it("goes to the restaurant login only when the refresh is definitely refused", async () => {
    fetchMock.mockResolvedValue(res(401))
    refresh.mockResolvedValue(null)
    const { unmount } = render(<PresenceHeartbeat />)
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/restaurant/login"))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    unmount()
  })

  it("other failures (5xx) do not refresh or log out", async () => {
    fetchMock.mockResolvedValue(res(502))
    const { unmount } = render(<PresenceHeartbeat />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(refresh).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    unmount()
  })
})
