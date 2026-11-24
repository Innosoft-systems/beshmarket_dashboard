/** @jest-environment node */
import { NextRequest } from "next/server"
import { config, middleware } from "./middleware"

const call = (path: string, method = "GET") =>
  middleware(new NextRequest(`http://localhost:3000${path}`, { method }))

describe("the messaging service worker", () => {
  it.each(["GET", "HEAD"])("is served without a session (%s)", async (method) => {
    const res = await call("/firebase-messaging-sw.js", method)
    expect(res.status).toBe(200)
    expect(res.headers.get("x-middleware-next")).toBe("1")
    expect(res.headers.get("set-cookie")).toBeNull()
  })

  it("is open for reads only", async () => {
    const res = await call("/firebase-messaging-sw.js", "POST")
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login")
  })

  it.each(["/firebase-messaging-sw.js.map", "/x/firebase-messaging-sw.js", "/other.js"])("does not open up %s", async (path) => {
    expect((await call(path)).status).toBe(307)
  })

  it("still passes through the guard's matcher", () => {
    expect(new RegExp(`^${config.matcher[0]}$`).test("/firebase-messaging-sw.js")).toBe(true)
  })
})
