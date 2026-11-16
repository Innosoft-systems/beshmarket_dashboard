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
  /** The product's 1C-created category has not been activated yet. */
  | "category_inactive"

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
  /** Rev 2 (T31/T33): last completed FULL catalog run (weekly reconciliation). */
  last_full_catalog_success_at?: string | null
  /** Rev 2 (T31): set by "request full sync", cleared by a completed full run. */
  full_sync_requested_at?: string | null
  /** Rev 2 (T33a): Tashkent hours in which silence counts as a broken link (B7). */
  heartbeat_window?: { from: string; to: string }
  /** Rev 3 (T31): 'HH:mm' Tashkent time of the daily full catalog (default '03:00'). */
  daily_full_at?: string
  /** Rev 2 (T33a): set by B7 while the link is considered down. */
  link_down_since?: string | null
  /** The push URL (B2 adds it to every connection view; optional for older backends). */
  endpoint_url?: string
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

export type RunKind = "catalog" | "offers"
export type RunStatus = "receiving" | "complete" | "needs_review" | "abandoned" | "superseded" | "failed"
/** Rev 2 (T29): catalog full|delta; offers delta|snapshot. */
export type RunMode = "full" | "delta" | "snapshot"

/** Run as listed (runs list, status `last_run`): no errors / diff_sample. */
export interface IntegrationRunSummary {
  _id: string
  kind: RunKind
  sync_id: string
  /** Rev 2. Older docs may lack it. */
  mode?: RunMode
  /** Rev 2 (T30): hourly aggregate of delta requests. */
  is_bucket?: boolean
  dry_run: boolean
  status: RunStatus
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
  createdAt?: string
}

export interface RunItemError {
  external_id: string | null
  code: string
  field?: string
  message: string
  batch_no?: number
}

export type DiffOp = "create" | "update" | "deactivate" | "reactivate" | "link"

export interface RunDiffItem {
  op: DiffOp
  external_id: string
  product_id?: string
  name: string
  changes?: Record<string, { from: unknown; to: unknown }>
}

/** GET /runs/:runId */
export interface IntegrationRun extends IntegrationRunSummary {
  source_ip?: string
  errors?: RunItemError[]
  diff_sample?: RunDiffItem[]
}

export interface RunsPage {
  data: IntegrationRunSummary[]
  pagination: { page: number; limit?: number; total: number; totalPages: number }
}

export interface RunsQuery {
  kind?: RunKind
  status?: RunStatus
  /** Rev 2 A2 filter "To'liq / O'zgarishlar". */
  mode?: "full" | "delta"
  page?: number
  limit?: number
}

/** integration_category_maps row (§3.1). */
export interface CategoryMap {
  _id?: string
  group_id: string
  path: string[]
  menu_category_id: string | null
  ignored: boolean
  auto: boolean
  product_count: number
  last_seen_at?: string | null
}

/** The venue's menu categories as GET …/categories lists them. */
export interface CategoryMenuOption {
  _id: string
  name_uz: string
  is_active: boolean
  source?: "1c" | null
}

/** Normalised GET …/categories (the backend sends `{ maps, categories }`). */
export interface CategoriesData {
  maps: CategoryMap[]
  menu_categories: CategoryMenuOption[]
}

/** PUT …/categories/:groupId */
export interface CategoryMapBody {
  menu_category_id: string | null
  ignored: boolean
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
    | "heartbeat_window"
    | "daily_full_at"
  >
>
