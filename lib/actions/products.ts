"use server"

import { revalidatePath } from "next/cache"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest, ApiError } from "@/lib/api/client"
import {
  PRODUCTS_PAGE_SIZE,
  type ProductCategoryCounts,
  type ProductQuery,
  type ProductsPage,
} from "@/lib/products-list"

export async function createProductAction(data: Record<string, unknown>) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest("/products", { method: "POST", body: data, accessToken: token })
    revalidatePath("/restaurants")
    return { success: true }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}

export async function updateProductAction(id: string, data: Record<string, unknown>) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest(`/products/${id}`, { method: "PATCH", body: data, accessToken: token })
    revalidatePath("/restaurants")
    return { success: true }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}

export async function deleteProductAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest(`/products/${id}`, { method: "DELETE", accessToken: token })
    revalidatePath("/restaurants")
    return { success: true }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}

export async function createMenuCategoryAction(data: Record<string, unknown>) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest("/menu-categories/menu", { method: "POST", body: data, accessToken: token })
    revalidatePath("/restaurants")
    return { success: true }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}

export async function deleteMenuCategoryAction(id: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: "Avtorizatsiya" }
  try {
    await apiRequest(`/menu-categories/menu/${id}`, { method: "DELETE", accessToken: token })
    revalidatePath("/restaurants")
    return { success: true }
  } catch (e: unknown) { return { success: false, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" } }
}


/**
 * The menu list is paged and searched on the server.
 *
 * It used to arrive as one 100-row fetch that the browser then filtered and
 * counted, so a venue with more than a hundred products showed the first
 * hundred and counted only those — the numbers beside each category described
 * the page, not the menu.
 *
 * `scope` picks the endpoint: an admin reads any venue by id, a venue reads
 * its own and passes no id at all.
 */
function productListPath(
  scope: "admin" | "restaurant",
  restaurantId: string | undefined,
  suffix: string,
  { page, search, menuCategoryId }: ProductQuery,
  limit: number,
) {
  const params = new URLSearchParams({ page: String(page ?? 1), limit: String(limit) })
  if (scope === "admin" && restaurantId) params.set("restaurant_id", restaurantId)
  if (search?.trim()) params.set("search", search.trim())
  if (menuCategoryId && menuCategoryId !== "all") params.set("menu_category_id", menuCategoryId)
  return `/products/${scope === "admin" ? "admin" : "my"}${suffix}?${params}`
}

export async function loadProductsPageAction(
  scope: "admin" | "restaurant",
  restaurantId: string | undefined,
  query: ProductQuery,
) {
  const token = await getAccessToken()
  if (!token) return { success: false as const, error: "Avtorizatsiya" }
  try {
    const res = await apiRequest<ProductsPage>(
      productListPath(scope, restaurantId, "", query, PRODUCTS_PAGE_SIZE),
      { accessToken: token },
    )
    return { success: true as const, data: res.data }
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" }
  }
}

/**
 * Counts for the category picker, under the same filter as the list but
 * ignoring which category is selected — otherwise every category but the
 * chosen one would read zero.
 */
export async function loadProductCountsAction(
  scope: "admin" | "restaurant",
  restaurantId: string | undefined,
  query: Omit<ProductQuery, "page" | "menuCategoryId">,
) {
  const token = await getAccessToken()
  if (!token) return { success: false as const, error: "Avtorizatsiya" }
  try {
    const res = await apiRequest<ProductCategoryCounts>(
      productListPath(scope, restaurantId, "/category-counts", query, 1),
      { accessToken: token },
    )
    return { success: true as const, data: res.data }
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof ApiError ? e.message : "Xatolik yuz berdi" }
  }
}
