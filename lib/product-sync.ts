/**
 * 1C-synced products in the admin / restaurant product list and form (plan A4,
 * backend B5). Pure helpers, no React (tested in lib/product-sync.test.ts).
 *
 * Everything here keys on `product.sync?.source === '1c'`: hand-made products
 * never match, so their UI stays exactly as before.
 */
import { HIDDEN_REASON_LABELS } from "@/lib/integrations"
import type { HiddenBySyncReason } from "@/types/integration"

/** Same list as the backend's LOCKABLE_FIELDS. */
export const LOCKABLE_FIELDS = [
  "name_uz",
  "name_ru",
  "name_en",
  "description_uz",
  "description_ru",
  "description_en",
  "images",
  "menu_category_id",
] as const
export type LockableField = (typeof LOCKABLE_FIELDS)[number]

export const LOCKABLE_FIELD_LABELS: Record<LockableField, string> = {
  name_uz: "Nomi (UZ)",
  name_ru: "Nomi (RU)",
  name_en: "Nomi (EN)",
  description_uz: "Tavsif (UZ)",
  description_ru: "Tavsif (RU)",
  description_en: "Tavsif (EN)",
  images: "Rasmlar",
  menu_category_id: "Kategoriya",
}

export interface ProductSyncInfo {
  source: "1c"
  locked_fields?: string[]
  manual_hidden?: boolean
  manual_unavailable?: boolean
  hidden_by_sync?: HiddenBySyncReason | null
}

/** What 1C manages for the venue (backend `IntegrationFlags`, plan §3.4). Only booleans: no connection data. */
export interface SyncFlags {
  connected: boolean
  price_managed: boolean
  stock_managed: boolean
  content_managed: boolean
}

export const NO_SYNC_FLAGS: SyncFlags = {
  connected: false,
  price_managed: false,
  stock_managed: false,
  content_managed: false,
}

/**
 * Admin side: the same formula as the backend's `integrationFlags`, from the
 * connection read. Returns only the four booleans, so the page can hand them
 * to client components without passing the connection (login etc.) along.
 */
export function flagsFromConnection(
  conn:
    | { enabled?: boolean; catalog_mode?: string; offers_mode?: string; retail_price_type_id?: string | null }
    | null
    | undefined,
): SyncFlags {
  if (!conn) return { ...NO_SYNC_FLAGS }
  const on = conn.enabled === true
  const catalogLive = conn.catalog_mode === "live"
  const offersLive = conn.offers_mode === "live"
  return {
    connected: true,
    price_managed: on && Boolean(conn.retail_price_type_id) && (catalogLive || offersLive),
    stock_managed: on && offersLive,
    content_managed: on && catalogLive,
  }
}

/** Panel side: keep only the four known booleans of `GET /integrations/1c/my/status`. */
export function parseSyncFlags(raw: unknown): SyncFlags {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    connected: r.connected === true,
    price_managed: r.price_managed === true,
    stock_managed: r.stock_managed === true,
    content_managed: r.content_managed === true,
  }
}

type WithSync = { sync?: ProductSyncInfo | null } | null | undefined

export function isSyncedProduct(p: WithSync): boolean {
  return p?.sync?.source === "1c"
}

/** Locked lockable fields of a synced product (unknown names dropped). */
export function lockedFields(p: WithSync): LockableField[] {
  if (!isSyncedProduct(p)) return []
  const locked = new Set(p!.sync!.locked_fields ?? [])
  return LOCKABLE_FIELDS.filter((f) => locked.has(f))
}

/** Price / discount / variant prices are read-only: a synced product while 1C manages prices. */
export function isPriceLocked(p: WithSync, flags: SyncFlags): boolean {
  return isSyncedProduct(p) && flags.price_managed
}

/** Uzbek label for why the sync hides a product; null when it doesn't. */
export function hiddenBySyncLabel(p: WithSync): string | null {
  const reason = isSyncedProduct(p) ? p!.sync!.hidden_by_sync : null
  if (!reason) return null
  return HIDDEN_REASON_LABELS[reason] ?? reason
}

/**
 * Toast after "show" (is_active → true) of a product the sync hides:
 * the panel request succeeds but the product stays hidden until the reason
 * clears; an admin override shows it, but the next sync may hide it again.
 */
export function showHiddenNotice(p: WithSync, scope: "admin" | "restaurant"): string | null {
  const label = hiddenBySyncLabel(p)
  if (!label) return null
  return scope === "restaurant"
    ? `Mahsulot yashirin qoladi: ${label}. Sabab 1C da tuzatilgach, o'zi ko'rinadi.`
    : `Ko'rsatildi. Diqqat: sabab "${label}", keyingi 1C sinxronlashi uni yana yashirishi mumkin.`
}

/** Shown on the confirm before unlocking. */
export function unlockConfirmText(field: LockableField): string {
  return `"${LOCKABLE_FIELD_LABELS[field]}" yana 1C ga qaytariladi. Keyingi sinxronlashda qo'lda kiritilgan qiymat 1C dagi qiymat bilan almashtiriladi.`
}
