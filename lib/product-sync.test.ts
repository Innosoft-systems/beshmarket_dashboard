import {
  NO_SYNC_FLAGS,
  flagsFromConnection,
  hiddenBySyncLabel,
  isPriceLocked,
  isSyncedProduct,
  lockedFields,
  parseSyncFlags,
  showHiddenNotice,
  syncedStock,
  unlockConfirmText,
} from "./product-sync"

const synced = (sync: Record<string, unknown> = {}) => ({ sync: { source: "1c" as const, ...sync } })

describe("isSyncedProduct", () => {
  it("only sync.source === '1c' counts", () => {
    expect(isSyncedProduct(synced())).toBe(true)
    expect(isSyncedProduct({})).toBe(false)
    expect(isSyncedProduct({ sync: null })).toBe(false)
    expect(isSyncedProduct(null)).toBe(false)
  })
})

describe("flagsFromConnection (admin) — same formula as the backend's integrationFlags", () => {
  it.each([
    [null, NO_SYNC_FLAGS],
    [
      { enabled: true, catalog_mode: "live", offers_mode: "off", retail_price_type_id: "pt" },
      { connected: true, price_managed: true, stock_managed: false, content_managed: true },
    ],
    [
      { enabled: true, catalog_mode: "live", offers_mode: "off", retail_price_type_id: null },
      { connected: true, price_managed: false, stock_managed: false, content_managed: true },
    ],
    [
      { enabled: true, catalog_mode: "dry_run", offers_mode: "live", retail_price_type_id: "pt" },
      { connected: true, price_managed: true, stock_managed: true, content_managed: false },
    ],
    [
      { enabled: false, catalog_mode: "live", offers_mode: "live", retail_price_type_id: "pt" },
      { connected: true, price_managed: false, stock_managed: false, content_managed: false },
    ],
  ])("%j", (conn, flags) => {
    expect(flagsFromConnection(conn)).toEqual(flags)
  })

  it("returns only the four booleans, never connection data such as the login", () => {
    const flags = flagsFromConnection({
      enabled: true,
      catalog_mode: "live",
      retail_price_type_id: "pt",
      login: "bm_semya_abc123",
      endpoint_url: "https://x",
    } as never)
    expect(Object.keys(flags).sort()).toEqual(["connected", "content_managed", "price_managed", "stock_managed"])
    expect(JSON.stringify(flags)).not.toContain("bm_semya")
  })
})

describe("parseSyncFlags (panel)", () => {
  it("keeps only true booleans of the four known keys", () => {
    expect(parseSyncFlags({ connected: true, price_managed: true, stock_managed: "yes", extra: "x" })).toEqual({
      connected: true,
      price_managed: true,
      stock_managed: false,
      content_managed: false,
    })
    expect(parseSyncFlags(null)).toEqual(NO_SYNC_FLAGS)
  })
})

describe("product state", () => {
  it("lists known locked fields only, in a fixed order", () => {
    expect(lockedFields(synced({ locked_fields: ["images", "name_uz", "bogus"] }))).toEqual(["name_uz", "images"])
    expect(lockedFields({ locked_fields: ["name_uz"] } as never)).toEqual([])
  })

  it("price is locked only for a synced product while 1C manages prices", () => {
    const managed = { ...NO_SYNC_FLAGS, connected: true, price_managed: true }
    expect(isPriceLocked(synced(), managed)).toBe(true)
    expect(isPriceLocked(synced(), NO_SYNC_FLAGS)).toBe(false)
    expect(isPriceLocked({}, managed)).toBe(false)
  })

  it("syncedStock: number when tracked, 'untracked' only while managed, null for hand-made", () => {
    const managed = { ...NO_SYNC_FLAGS, connected: true, stock_managed: true }
    expect(syncedStock({ ...synced(), stock: 3 }, NO_SYNC_FLAGS)).toBe(3)
    expect(syncedStock({ ...synced(), stock: 0 }, managed)).toBe(0)
    expect(syncedStock({ ...synced(), stock: null }, managed)).toBe("untracked")
    expect(syncedStock({ ...synced(), stock: null }, NO_SYNC_FLAGS)).toBeNull()
    expect(syncedStock({ stock: 5 } as never, managed)).toBeNull()
  })

  it("labels the sync's hide reason in Uzbek", () => {
    expect(hiddenBySyncLabel(synced({ hidden_by_sync: "missing" }))).toBe("1C da yo'q")
    expect(hiddenBySyncLabel(synced({ hidden_by_sync: "no_price" }))).toBe("Narx yo'q")
    expect(hiddenBySyncLabel(synced({ hidden_by_sync: "weighted" }))).toBe("Tarozi mahsuloti")
    expect(hiddenBySyncLabel(synced({ hidden_by_sync: "category_inactive" }))).toBe("Kategoriya hali faollashtirilmagan")
    expect(hiddenBySyncLabel(synced())).toBeNull()
  })

  it("explains what 'show' does to a sync-hidden product, per scope", () => {
    const p = synced({ hidden_by_sync: "no_price" })
    expect(showHiddenNotice(p, "restaurant")).toMatch(/yashirin qoladi: Narx yo'q/)
    expect(showHiddenNotice(p, "admin")).toMatch(/yana yashirishi mumkin/)
    expect(showHiddenNotice(synced(), "restaurant")).toBeNull()
  })

  it("unlock confirm names the field", () => {
    expect(unlockConfirmText("name_uz")).toMatch(/^"Nomi \(UZ\)" yana 1C ga qaytariladi/)
  })
})
