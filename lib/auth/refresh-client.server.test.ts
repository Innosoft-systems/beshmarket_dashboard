/** @jest-environment node */
import { refreshAccessToken } from "./refresh-client"

// On the server a module is shared by every user of the process: the client
// refresh (and its in-flight/last-token state) must never run there.
it("does nothing on the server: no fetch, no shared module state", async () => {
  const fetchMock = jest.fn()
  global.fetch = fetchMock as unknown as typeof fetch
  await expect(refreshAccessToken()).resolves.toBeNull()
  await expect(refreshAccessToken()).resolves.toBeNull()
  expect(fetchMock).not.toHaveBeenCalled()
})
