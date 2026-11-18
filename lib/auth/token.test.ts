import { classifyRefreshStatus, isExpired, isFreshlyIssued, parseJwt } from "./token"
import { makeJwt } from "./test-jwt"

describe("token helpers", () => {
  it("parses claims and rejects garbage", () => {
    expect(parseJwt(makeJwt({ role: "admin" }))?.role).toBe("admin")
    expect(parseJwt("not-a-jwt")).toBeNull()
  })

  it("isExpired counts the 30 s skew and missing tokens", () => {
    expect(isExpired(undefined)).toBe(true)
    expect(isExpired(makeJwt({ expIn: 900 }))).toBe(false)
    expect(isExpired(makeJwt({ expIn: 20 }))).toBe(true)
    expect(isExpired(makeJwt({ expIn: -5 }))).toBe(true)
  })

  it("isFreshlyIssued: issued within 60 s and not about to expire", () => {
    expect(isFreshlyIssued(makeJwt({ iatAgo: 5, expIn: 895 }))).toBe(true)
    expect(isFreshlyIssued(makeJwt({ iatAgo: 120, expIn: 780 }))).toBe(false)
    expect(isFreshlyIssued(makeJwt({ iatAgo: 5, expIn: 30 }))).toBe(false)
    expect(isFreshlyIssued(undefined)).toBe(false)
  })

  it.each([
    [400, "unauthorized"],
    [401, "unauthorized"],
    [403, "unauthorized"],
    [429, "unavailable"],
    [500, "unavailable"],
    [502, "unavailable"],
    [503, "unavailable"],
  ])("refresh status %p is %p", (status, kind) => {
    expect(classifyRefreshStatus(status)).toBe(kind)
  })
})
