import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { ProductsClient } from "@/components/restaurants/ProductsClient"
import {
  PRODUCTS_PAGE_SIZE,
  type ProductCategoryCounts,
  type ProductsPage,
} from "@/lib/products-list"

const EMPTY_PAGE: ProductsPage = {
  data: [],
  pagination: { page: 1, totalPages: 1, total: 0 },
}

export default async function RestaurantMenuPage() {
  const token = await getAccessToken()

  // First page only — the table pages the rest in as it is scrolled, and the
  // counts are computed over the whole menu rather than over what loaded.
  const [restaurantRes, productsRes, categoriesRes, countsRes] = await Promise.all([
    apiRequest<any>("/restaurants/my", { accessToken: token }).catch(() => null),
    apiRequest<ProductsPage>(`/products/my?page=1&limit=${PRODUCTS_PAGE_SIZE}`, {
      accessToken: token,
    }).catch(() => null),
    apiRequest<any>("/menu-categories/my/menu", { accessToken: token }).catch(() => null),
    apiRequest<ProductCategoryCounts>("/products/my/category-counts", {
      accessToken: token,
    }).catch(() => null),
  ])

  const initial = productsRes?.data ?? EMPTY_PAGE
  const categories = Array.isArray(categoriesRes?.data) ? categoriesRes.data : []
  const counts = countsRes?.data ?? { total: 0, uncategorized: 0, by_category: {} }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Menyu</h1>
        <p className="text-sm text-muted-foreground">
          Kategoriyalar va mahsulotlarni boshqarish · {counts.total} ta mahsulot
        </p>
      </div>
      <ProductsClient
        restaurant={restaurantRes?.data}
        initial={initial}
        counts={counts}
        categories={categories}
        scope="restaurant"
      />
    </div>
  )
}
