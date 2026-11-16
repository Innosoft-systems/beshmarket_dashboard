import {
  connectionSettingsSchema,
  connectionToForm,
  formToPatch,
  isValidIp,
  type ConnectionSettingsValues,
} from "./integration"
import { makeConnection } from "@/components/integrations/fixtures"

const base = () => connectionToForm(makeConnection())

function issues(values: ConnectionSettingsValues) {
  const r = connectionSettingsSchema.safeParse(values)
  return r.success ? [] : r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
}

describe("isValidIp", () => {
  // Same rules as the backend's isIpOrCidr: exact addresses and CIDR ranges.
  it.each(["203.0.113.10", "10.0.0.1", " 192.168.1.1 ", "2001:db8::1", "::1", "203.0.113.0/24", "2001:db8::/32"])("accepts %s", (ip) => {
    expect(isValidIp(ip)).toBe(true)
  })
  // IPv4-mapped IPv6 is refused by the backend DTO, so here too (RV-2b D-1).
  it.each(["", "256.1.1.1", "1.2.3", "1.2.3.4/33", "1.2.3.4/", "example.com", "1.2.3.4.5", "::ffff:203.0.113.7", "::FFFF:10.0.0.1"])("rejects %s", (ip) => {
    expect(isValidIp(ip)).toBe(false)
  })
})

describe("connectionSettingsSchema", () => {
  it("accepts the form built from a stored connection", () => {
    expect(issues(base())).toEqual([])
  })

  it("allows at most 20 IPs (backend ArrayMaxSize(20))", () => {
    const ips = (n: number) => Array.from({ length: n }, (_, i) => `10.0.0.${i + 1}`)
    expect(issues({ ...base(), allowed_ips: ips(20) })).toEqual([])
    expect(issues({ ...base(), allowed_ips: ips(21) })[0].path).toBe("allowed_ips")
  })

  it("rejects a bad IP in the list", () => {
    expect(issues({ ...base(), allowed_ips: ["203.0.113.10", "nope"] })[0].path).toBe("allowed_ips")
  })

  it.each([
    ["", "Butun son kiriting"],
    ["-1", "Butun son kiriting"],
    ["1.5", "Butun son kiriting"],
    ["1001", "Zaxira 0 dan 1000 gacha bo'lishi kerak"],
  ])("stock_buffer %p → %s", (value, message) => {
    expect(issues({ ...base(), stock_buffer: value })).toEqual([{ path: "stock_buffer", message }])
  })

  it.each(["0", "1000"])("stock_buffer %p is allowed", (value) => {
    expect(issues({ ...base(), stock_buffer: value })).toEqual([])
  })

  it.each([
    ["4", false],
    ["5", true],
    ["100", true],
    ["101", false],
  ])("max_deactivate_percent %p ok=%p", (value, ok) => {
    expect(issues({ ...base(), max_deactivate_percent: value }).length === 0).toBe(ok)
  })

  it("offers live needs a retail price type", () => {
    expect(issues({ ...base(), offers_mode: "live" })).toEqual([
      { path: "offers_mode", message: "Jonli rejim uchun avval chakana narx turini tanlang" },
    ])
    expect(issues({ ...base(), offers_mode: "live", retail_price_type_id: "pt-retail" })).toEqual([])
  })

  it("promo price type must differ from retail", () => {
    const v = { ...base(), retail_price_type_id: "pt-retail", promo_price_type_id: "pt-retail" }
    expect(issues(v).map((i) => i.path)).toEqual(["promo_price_type_id"])
  })
})

describe("schedule fields (rev 2 / rev 3)", () => {
  it.each(["03:00", "00:00", "23:59"])("accepts %s", (t) => {
    expect(issues({ ...base(), daily_full_at: t, heartbeat_from: t, heartbeat_to: t === "00:00" ? "01:00" : "00:00" })).toEqual([])
  })
  it.each(["3:00", "24:00", "12:60", "", "noon"])("rejects daily_full_at %p", (t) => {
    expect(issues({ ...base(), daily_full_at: t }).map((i) => i.path)).toEqual(["daily_full_at"])
  })
  it("rejects an empty heartbeat window (same start and end)", () => {
    expect(issues({ ...base(), heartbeat_from: "08:00", heartbeat_to: "08:00" })).toEqual([
      { path: "heartbeat_to", message: "Boshlanish va tugash vaqti bir xil bo'lmasin" },
    ])
  })
})

describe("connectionToForm", () => {
  it("maps nulls to empty selects and the ratio to a percent string", () => {
    const f = connectionToForm(makeConnection({ max_deactivate_ratio: 0.3, stock_buffer: 2 }))
    expect(f.retail_price_type_id).toBe("")
    expect(f.promo_price_type_id).toBe("")
    expect(f.max_deactivate_percent).toBe("30")
    expect(f.stock_buffer).toBe("2")
  })

  it("copies the arrays (editing the form never mutates the connection)", () => {
    const c = makeConnection()
    const f = connectionToForm(c)
    f.allowed_ips.push("10.0.0.1")
    expect(c.allowed_ips).toEqual(["203.0.113.10"])
  })
})

describe("formToPatch", () => {
  it("defaults schedule fields when the connection has none (older backend)", () => {
    const c = makeConnection({ daily_full_at: undefined, heartbeat_window: undefined })
    const f = connectionToForm(c)
    expect([f.daily_full_at, f.heartbeat_from, f.heartbeat_to]).toEqual(["03:00", "08:00", "22:00"])
    expect(formToPatch(f, c)).toEqual({})
  })

  it("sends daily_full_at alone and the heartbeat window as one object", () => {
    const c = makeConnection({ daily_full_at: "03:00", heartbeat_window: { from: "08:00", to: "22:00" } })
    expect(formToPatch({ ...connectionToForm(c), daily_full_at: "02:30" }, c)).toEqual({ daily_full_at: "02:30" })
    expect(formToPatch({ ...connectionToForm(c), heartbeat_to: "23:00" }, c)).toEqual({
      heartbeat_window: { from: "08:00", to: "23:00" },
    })
  })

  it("is empty when nothing changed", () => {
    const c = makeConnection()
    expect(formToPatch(connectionToForm(c), c)).toEqual({})
  })

  it("sends only changed fields, converted to API types", () => {
    const c = makeConnection()
    const patch = formToPatch(
      {
        ...connectionToForm(c),
        catalog_mode: "live",
        retail_price_type_id: "pt-retail",
        stock_buffer: "3",
        max_deactivate_percent: "25",
        new_products_visible: false,
      },
      c,
    )
    expect(patch).toEqual({
      catalog_mode: "live",
      retail_price_type_id: "pt-retail",
      stock_buffer: 3,
      max_deactivate_ratio: 0.25,
      new_products_visible: false,
    })
  })

  it("clearing a price type sends null", () => {
    const c = makeConnection({ promo_price_type_id: "pt-promo" })
    expect(formToPatch({ ...connectionToForm(c), promo_price_type_id: "" }, c)).toEqual({ promo_price_type_id: null })
  })

  it("list order does not count as a change; content does", () => {
    const c = makeConnection({ allowed_ips: ["1.1.1.1", "2.2.2.2"], warehouse_ids: ["wh-1", "wh-2"] })
    const same = { ...connectionToForm(c), allowed_ips: ["2.2.2.2", "1.1.1.1"], warehouse_ids: ["wh-2", "wh-1"] }
    expect(formToPatch(same, c)).toEqual({})
    expect(formToPatch({ ...same, allowed_ips: [] }, c)).toEqual({ allowed_ips: [] })
    expect(formToPatch({ ...same, warehouse_ids: ["wh-1"] }, c)).toEqual({ warehouse_ids: ["wh-1"] })
  })
})
