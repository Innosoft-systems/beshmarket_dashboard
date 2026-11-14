import type { IntegrationConnection, IntegrationStatus } from "@/types/integration"

/** Test fixtures for the 1C integration components (not imported by app code). */
export function makeConnection(overrides: Partial<IntegrationConnection> = {}): IntegrationConnection {
  return {
    _id: "conn1",
    restaurant_id: "rest1",
    protocol: "json",
    enabled: true,
    catalog_mode: "dry_run",
    offers_mode: "off",
    login: "bm_semya_a1b2c3",
    secret_rotated_at: "2026-11-14T08:00:00.000Z",
    allowed_ips: ["203.0.113.10"],
    retail_price_type_id: null,
    promo_price_type_id: null,
    warehouse_ids: [],
    stock_buffer: 0,
    category_level: "top",
    new_products_visible: true,
    max_deactivate_ratio: 0.5,
    seen_price_types: [
      { id: "pt-retail", name: "Розничная", last_seen_at: "2026-11-14T08:00:00.000Z" },
      { id: "pt-promo", name: "Акция", last_seen_at: "2026-11-14T08:00:00.000Z" },
    ],
    seen_warehouses: [
      { id: "wh-1", name: "Основной склад", last_seen_at: "2026-11-14T08:00:00.000Z" },
      { id: "wh-2", name: "Магазин", last_seen_at: "2026-11-14T08:00:00.000Z" },
    ],
    last_request_at: "2026-11-14T08:05:00.000Z",
    last_catalog_success_at: null,
    last_offers_success_at: null,
    last_error: null,
    ...overrides,
  }
}

export function makeStatus(overrides: Partial<IntegrationStatus> = {}): IntegrationStatus {
  return {
    connection: makeConnection(),
    synced_products: 120,
    active_synced: 100,
    hidden_by_sync: { missing: 12, weighted: 8 },
    stale: false,
    last_run: { catalog: null, offers: null },
    ...overrides,
  }
}

/**
 * jsdom has no PointerEvent, and base-ui's Switch references it on click.
 * Installed per test file (not in jest.setup) so other suites are unaffected.
 */
export function installPointerEventPolyfill(): void {
  if (typeof window === "undefined" || typeof window.PointerEvent !== "undefined") return
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number
    readonly pointerType: string
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 1
      this.pointerType = init.pointerType ?? "mouse"
    }
  }
  ;(window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventPolyfill
  ;(globalThis as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventPolyfill
}
