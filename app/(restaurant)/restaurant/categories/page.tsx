import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { CategoriesClient } from "@/components/restaurant-panel/CategoriesClient"

export default async function RestaurantCategoriesPage() {
  const token = await getAccessToken()

  const [restaurantRes, categoriesRes] = await Promise.all([
    apiRequest<any>("/restaurants/my", { accessToken: token }).catch(() => null),
    apiRequest<any>("/menu-categories/my/menu", { accessToken: token }).catch(() => null),
  ])

  const categories = Array.isArray(categoriesRes?.data) ? categoriesRes.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kategoriyalar</h1>
        <p className="text-sm text-muted-foreground">Menyu kategoriyalarini boshqarish</p>
      </div>
      <CategoriesClient
        restaurant={restaurantRes?.data}
        categories={categories}
      />
    </div>
  )
}
