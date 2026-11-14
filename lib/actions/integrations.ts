"use server"

import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"
import { normaliseCategoriesData } from "@/lib/integrations"
import type {
  CategoriesData,
  CategoryMap,
  CategoryMapBody,
  ConnectionPatch,
  CreateConnectionResult,
  IntegrationConnection,
  IntegrationCredentials,
  IntegrationProtocol,
  IntegrationRun,
  IntegrationStatus,
  RunsPage,
  RunsQuery,
} from "@/types/integration"

/**
 * 1C integration, admin endpoints (plan §3.3, base /integrations/1c).
 *
 * Secret handling: create and rotate return the plain secret to the calling
 * client component only. These actions never call revalidatePath / cache the
 * response, and nothing here logs a response body, so the secret is not part of
 * any RSC payload or server log.
 */

type Result<T> = { success: true; data: T } | { success: false; error: string; status?: number }

async function call<T>(
  endpoint: string,
  method: "GET" | "POST" | "PATCH" | "PUT",
  body?: unknown,
): Promise<Result<T>> {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiyadan o'tilmagan" }
  try {
    const res = await apiRequest<T>(endpoint, { method, body, accessToken: token })
    return { success: true, data: res.data }
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      // ApiError carries the backend `error` text (a class-validator list arrives comma-joined).
      return { success: false, error: error.message || "Xatolik yuz berdi", status: error.statusCode }
    }
    return { success: false, error: "Xatolik yuz berdi" }
  }
}

const BASE = "/integrations/1c"

export async function getConnectionAction(restaurantId: string) {
  return call<IntegrationConnection | null>(
    `${BASE}/connections?restaurant_id=${encodeURIComponent(restaurantId)}`,
    "GET",
  )
}

export async function createConnectionAction(restaurantId: string, protocol: IntegrationProtocol) {
  return call<CreateConnectionResult>(`${BASE}/connections`, "POST", { restaurant_id: restaurantId, protocol })
}

export async function updateConnectionAction(connectionId: string, patch: ConnectionPatch) {
  return call<IntegrationConnection>(`${BASE}/connections/${encodeURIComponent(connectionId)}`, "PATCH", patch)
}

export async function rotateSecretAction(connectionId: string) {
  return call<IntegrationCredentials>(
    `${BASE}/connections/${encodeURIComponent(connectionId)}/rotate-secret`,
    "POST",
  )
}

export async function getConnectionStatusAction(connectionId: string) {
  return call<IntegrationStatus>(`${BASE}/connections/${encodeURIComponent(connectionId)}/status`, "GET")
}

/** Rev 2 (T31): ask the store's 1C for a full upload on its next request. Idempotent. */
export async function requestFullSyncAction(connectionId: string) {
  return call<IntegrationConnection>(
    `${BASE}/connections/${encodeURIComponent(connectionId)}/request-full-sync`,
    "POST",
  )
}

// ─── Run log (A2) ───────────────────────────────────────────────────────────

export async function listRunsAction(connectionId: string, query: RunsQuery = {}) {
  const params = new URLSearchParams()
  if (query.kind) params.set("kind", query.kind)
  if (query.status) params.set("status", query.status)
  if (query.mode) params.set("mode", query.mode)
  params.set("page", String(query.page ?? 1))
  params.set("limit", String(query.limit ?? 20))
  return call<RunsPage>(`${BASE}/connections/${encodeURIComponent(connectionId)}/runs?${params}`, "GET")
}

export async function getRunAction(runId: string) {
  return call<IntegrationRun>(`${BASE}/runs/${encodeURIComponent(runId)}`, "GET")
}

// ─── Category mapping (A3) ──────────────────────────────────────────────────

export async function getCategoryMapsAction(connectionId: string): Promise<Result<CategoriesData>> {
  const res = await call<unknown>(`${BASE}/connections/${encodeURIComponent(connectionId)}/categories`, "GET")
  return res.success ? { success: true, data: normaliseCategoriesData(res.data) } : res
}

export async function putCategoryMapAction(connectionId: string, groupId: string, body: CategoryMapBody) {
  return call<CategoryMap>(
    `${BASE}/connections/${encodeURIComponent(connectionId)}/categories/${encodeURIComponent(groupId)}`,
    "PUT",
    body,
  )
}
