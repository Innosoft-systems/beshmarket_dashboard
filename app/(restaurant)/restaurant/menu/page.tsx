import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { ProductsClient } from "@/components/restaurants/ProductsClient"

export default async function RestaurantMenuPage() {
  const token = await getAccessToken()

  const [restaurantRes, productsRes, categoriesRes] = await Promise.all([
    apiRequest<any>("/restaurants/my", { accessToken: token }).catch(() => null),
    apiRequest<any>("/products/my?limit=100", { accessToken: token }).catch(() => null),
    apiRequest<any>("/menu-categories/my/menu", { accessToken: token }).catch(() => null),
  ])

  const products = productsRes?.data?.data || productsRes?.data || []
  const categories = Array.isArray(categoriesRes?.data) ? categoriesRes.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Menyu</h1>
        <p className="text-sm text-muted-foreground">
          Kategoriyalar va mahsulotlarni boshqarish
        </p>
      </div>
      <ProductsClient
        restaurant={restaurantRes.data}
        products={products}
        categories={categories}
        scope="restaurant"
      />
    </div>
  )
}
