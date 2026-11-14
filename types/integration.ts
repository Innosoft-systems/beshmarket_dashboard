/**
 * 1C integration, admin side. Shapes follow the frozen contract in
 * .agents/plans/1c-our-side-2026-11-14.md §3.1 / §3.3. The secret hash is never
 * part of any of these: the plain secret exists only in `IntegrationCredentials`,
 * which the backend returns once (create / rotate) and the UI never stores.
 */

export type IntegrationProtocol = "json" | "commerceml"
export type IntegrationMode = "off" | "dry_run" | "live"
export type CategoryLevel = "top" | "leaf"

export type HiddenBySyncReason =
  | "missing"
  | "inactive_in_1c"
  | "weighted"
  | "no_price"
  | "category_ignored"

export interface SeenOneCRef {
  id: string
  name?: string
  last_seen_at?: string
}

export interface IntegrationAuditEntry {
  action: "created" | "rotated" | "enabled" | "disabled" | "settings_changed"
  /** Admin user id; null when not known. */
  by: string | null
  at: string
}

export interface IntegrationConnection {
  _id: string
  restaurant_id: string
  protocol: IntegrationProtocol
  enabled: boolean
  catalog_mode: IntegrationMode
  offers_mode: IntegrationMode
  login: string
  secret_rotated_at?: string | null
  allowed_ips: string[]
  retail_price_type_id: string | null
  promo_price_type_id: string | null
  warehouse_ids: string[]
  stock_buffer: number
  category_level: CategoryLevel
  new_products_visible: boolean
  max_deactivate_ratio: number
  seen_price_types: SeenOneCRef[]
  seen_warehouses: SeenOneCRef[]
  last_request_at?: string | null
  last_catalog_success_at?: string | null
  last_offers_success_at?: string | null
  last_error?: { at: string; message: string } | null
  audit?: IntegrationAuditEntry[]
  createdAt?: string
  updatedAt?: string
}

/** Returned only by POST /connections and POST /connections/:id/rotate-secret. */
export interface IntegrationCredentials {
  login: string
  secret: string
  endpoint_url: string
}

export interface CreateConnectionResult {
  connection: IntegrationConnection
  credentials: IntegrationCredentials
}

/** Run summary as listed by the status endpoint (no errors / diff_sample). */
export interface IntegrationRunSummary {
  _id: string
  kind: "catalog" | "offers"
  sync_id: string
  dry_run: boolean
  status: "receiving" | "complete" | "needs_review" | "abandoned" | "superseded" | "failed"
  batch_total: number
  batches_done: number[]
  first_batch_at?: string | null
  last_batch_at?: string | null
  finished_at?: string | null
  counters?: Partial<Record<
    | "accepted"
    | "created"
    | "updated"
    | "unchanged"
    | "rejected"
    | "deactivated"
    | "reactivated"
    | "skipped"
    | "images_saved"
    | "images_failed",
    number
  >>
}

export interface IntegrationStatus {
  connection: IntegrationConnection
  synced_products: number
  active_synced: number
  hidden_by_sync: Partial<Record<HiddenBySyncReason, number>>
  stale: boolean
  last_run: {
    catalog: IntegrationRunSummary | null
    offers: IntegrationRunSummary | null
  }
}

/** Fields PATCH /connections/:id accepts (§3.3). */
export type ConnectionPatch = Partial<
  Pick<
    IntegrationConnection,
    | "enabled"
    | "catalog_mode"
    | "offers_mode"
    | "allowed_ips"
    | "retail_price_type_id"
    | "promo_price_type_id"
    | "warehouse_ids"
    | "stock_buffer"
    | "category_level"
    | "new_products_visible"
    | "max_deactivate_ratio"
    | "protocol"
  >
>
