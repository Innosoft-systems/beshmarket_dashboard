import { z } from "zod"
import { DEFAULT_DAILY_FULL_AT, DEFAULT_HEARTBEAT_WINDOW } from "@/lib/integrations"
import type { ConnectionPatch, IntegrationConnection } from "@/types/integration"

/** Backend limits: contract §3.3 and UpdateConnectionDto (eco-xarid-back B1). */
export const STOCK_BUFFER_MAX = 1000
export const DEACTIVATE_PERCENT_MIN = 5
export const DEACTIVATE_PERCENT_MAX = 100
export const MAX_ALLOWED_IPS = 20
/** Backend MIN_LIVE_STOCK_BUFFER (ae70816, R3-2a): live offers need a buffer of at least 1. */
export const MIN_LIVE_STOCK_BUFFER = 1
/** New connections default to a buffer of 1 (backend schema default). */
export const DEFAULT_STOCK_BUFFER = 1

export const LIVE_RETAIL_MESSAGE = "Jonli rejim uchun chakana narx turini tanlang"
export const LIVE_WAREHOUSE_MESSAGE = "Jonli rejim uchun kamida bitta omborni tanlang"
export const LIVE_BUFFER_MESSAGE = `Jonli rejimda zaxira kamida ${MIN_LIVE_STOCK_BUFFER} bo'lishi kerak: ilovadagi sotuvlar 1C ga darhol tushmaydi, zaxira bir donani ikki marta sotishdan saqlaydi`

/**
 * Live offers rules of the backend (ae70816): retail type, at least one
 * warehouse, buffer >= 1. Each issue sits on the field the admin has to fix,
 * in plain Uzbek (no field names). A buffer that is not a number already has
 * its own range error, so it is not reported twice.
 */
export function liveOffersIssues(v: {
  retail_price_type_id: string
  warehouse_ids: string[]
  stock_buffer: string
}): { path: "retail_price_type_id" | "warehouse_ids" | "stock_buffer"; message: string }[] {
  const issues: { path: "retail_price_type_id" | "warehouse_ids" | "stock_buffer"; message: string }[] = []
  if (!v.retail_price_type_id) issues.push({ path: "retail_price_type_id", message: LIVE_RETAIL_MESSAGE })
  if (!v.warehouse_ids.length) issues.push({ path: "warehouse_ids", message: LIVE_WAREHOUSE_MESSAGE })
  const raw = v.stock_buffer.trim()
  if (/^\d+$/.test(raw) && Number(raw) < MIN_LIVE_STOCK_BUFFER) {
    issues.push({ path: "stock_buffer", message: LIVE_BUFFER_MESSAGE })
  }
  return issues
}

const ipSchema = z.union([z.ipv4(), z.ipv6(), z.cidrv4(), z.cidrv6()])

/**
 * An IPv4/IPv6 address or a CIDR range, as the backend DTO accepts. IPv4-mapped
 * IPv6 (`::ffff:203.0.113.7`) is refused there with a hint, so it is refused
 * here too (RV-2b D-1): write the plain IPv4 address instead.
 */
export function isValidIp(value: string): boolean {
  const v = value.trim()
  if (/^::ffff:/i.test(v)) return false
  return ipSchema.safeParse(v).success
}

/** 'HH:mm', same pattern as the backend DTO (^([01]\d|2[0-3]):[0-5]\d$). */
const hhmm = (label: string) =>
  z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, `${label}: vaqtni 03:00 ko'rinishida kiriting`)

const intInRange = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, "Butun son kiriting")
    // Zod 4 keeps checking after a failed regex; only range-check real integers, so one message shows.
    .refine((v) => !/^\d+$/.test(v) || (Number(v) >= min && Number(v) <= max), message)

/**
 * The settings form. Number inputs stay strings in the form (so an empty
 * field is a validation error, not a silent 0) and are converted in
 * `formToPatch`. "" in the price type selects means "not chosen" (null).
 */
export const connectionSettingsSchema = z
  .object({
    protocol: z.enum(["json", "commerceml"]),
    catalog_mode: z.enum(["off", "dry_run", "live"]),
    offers_mode: z.enum(["off", "dry_run", "live"]),
    allowed_ips: z
      .array(z.string())
      .max(MAX_ALLOWED_IPS, `Ko'pi bilan ${MAX_ALLOWED_IPS} ta IP manzil`)
      .refine((ips) => ips.every(isValidIp), "Noto'g'ri IP manzil bor"),
    retail_price_type_id: z.string(),
    promo_price_type_id: z.string(),
    warehouse_ids: z.array(z.string()),
    stock_buffer: intInRange(0, STOCK_BUFFER_MAX, `Zaxira 0 dan ${STOCK_BUFFER_MAX} gacha bo'lishi kerak`),
    category_level: z.enum(["top", "leaf"]),
    new_products_visible: z.boolean(),
    max_deactivate_percent: intInRange(
      DEACTIVATE_PERCENT_MIN,
      DEACTIVATE_PERCENT_MAX,
      `Chegara ${DEACTIVATE_PERCENT_MIN}% dan ${DEACTIVATE_PERCENT_MAX}% gacha bo'lishi kerak`,
    ),
    /** Rev 3: daily full catalog time (Tashkent). */
    daily_full_at: hhmm("To'liq katalog vaqti"),
    /** Rev 2: hours in which 30 min of silence counts as a broken link. */
    heartbeat_from: hhmm("Boshlanishi"),
    heartbeat_to: hhmm("Tugashi"),
  })
  .superRefine((v, ctx) => {
    // Live offers: the backend's rules and text (ae70816): retail type, a warehouse, buffer >= 1.
    if (v.offers_mode === "live") {
      for (const i of liveOffersIssues(v)) ctx.addIssue({ code: "custom", path: [i.path], message: i.message })
    }
    // Equal ends would make an empty window (the backend would never alert).
    if (v.heartbeat_from && v.heartbeat_from === v.heartbeat_to) {
      ctx.addIssue({
        code: "custom",
        path: ["heartbeat_to"],
        message: "Boshlanish va tugash vaqti bir xil bo'lmasin",
      })
    }
    if (v.promo_price_type_id && v.promo_price_type_id === v.retail_price_type_id) {
      ctx.addIssue({
        code: "custom",
        path: ["promo_price_type_id"],
        message: "Aksiya narxi chakana narx bilan bir xil bo'lmasligi kerak",
      })
    }
  })

export type ConnectionSettingsValues = z.infer<typeof connectionSettingsSchema>

export function connectionToForm(c: IntegrationConnection): ConnectionSettingsValues {
  return {
    protocol: c.protocol,
    catalog_mode: c.catalog_mode,
    offers_mode: c.offers_mode,
    allowed_ips: [...(c.allowed_ips ?? [])],
    retail_price_type_id: c.retail_price_type_id ?? "",
    promo_price_type_id: c.promo_price_type_id ?? "",
    warehouse_ids: [...(c.warehouse_ids ?? [])],
    stock_buffer: String(c.stock_buffer ?? DEFAULT_STOCK_BUFFER),
    category_level: c.category_level,
    new_products_visible: c.new_products_visible,
    max_deactivate_percent: String(Math.round((c.max_deactivate_ratio ?? 0.5) * 100)),
    daily_full_at: c.daily_full_at ?? DEFAULT_DAILY_FULL_AT,
    heartbeat_from: c.heartbeat_window?.from ?? DEFAULT_HEARTBEAT_WINDOW.from,
    heartbeat_to: c.heartbeat_window?.to ?? DEFAULT_HEARTBEAT_WINDOW.to,
  }
}

function sameList(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sb = [...b].sort()
  return [...a].sort().every((x, i) => x === sb[i])
}

/**
 * Only the fields that changed, so a save never re-sends (and re-audits)
 * settings nobody touched. An empty object means "nothing to save".
 */
export function formToPatch(v: ConnectionSettingsValues, c: IntegrationConnection): ConnectionPatch {
  const patch: ConnectionPatch = {}
  if (v.protocol !== c.protocol) patch.protocol = v.protocol
  if (v.catalog_mode !== c.catalog_mode) patch.catalog_mode = v.catalog_mode
  if (v.offers_mode !== c.offers_mode) patch.offers_mode = v.offers_mode

  const ips = v.allowed_ips.map((ip) => ip.trim())
  if (!sameList(ips, c.allowed_ips ?? [])) patch.allowed_ips = ips

  const retail = v.retail_price_type_id || null
  if (retail !== (c.retail_price_type_id ?? null)) patch.retail_price_type_id = retail
  const promo = v.promo_price_type_id || null
  if (promo !== (c.promo_price_type_id ?? null)) patch.promo_price_type_id = promo

  if (!sameList(v.warehouse_ids, c.warehouse_ids ?? [])) patch.warehouse_ids = [...v.warehouse_ids]

  const buffer = Number(v.stock_buffer)
  if (buffer !== (c.stock_buffer ?? DEFAULT_STOCK_BUFFER)) patch.stock_buffer = buffer
  if (v.category_level !== c.category_level) patch.category_level = v.category_level
  if (v.new_products_visible !== c.new_products_visible) patch.new_products_visible = v.new_products_visible

  const ratio = Number(v.max_deactivate_percent) / 100
  if (Math.round(ratio * 100) !== Math.round((c.max_deactivate_ratio ?? 0.5) * 100)) {
    patch.max_deactivate_ratio = ratio
  }

  if (v.daily_full_at.trim() !== (c.daily_full_at ?? DEFAULT_DAILY_FULL_AT)) patch.daily_full_at = v.daily_full_at.trim()
  // The window is one object on the server: send both ends when either changed.
  const from = v.heartbeat_from.trim()
  const to = v.heartbeat_to.trim()
  const cur = c.heartbeat_window ?? DEFAULT_HEARTBEAT_WINDOW
  if (from !== cur.from || to !== cur.to) patch.heartbeat_window = { from, to }
  return patch
}
