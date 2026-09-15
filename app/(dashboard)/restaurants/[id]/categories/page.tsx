import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { CategoriesClient } from "@/components/restaurant-panel/CategoriesClient"

export const metadata: Metadata = { title: "Kategoriyalar | BeshMarket" }

interface Props {
  params: Promise<{ id: string }>
}

interface RestaurantSummary {
  _id: string
  name?: string
}

type MenuCategory = Record<string, unknown>

/**
 * Faqat o'qish try/catch ichida. JSX tashqarida quriladi: ichkarida bo'lsa,
 * komponent render paytida yiqilsa ham "topilmadi" ga aylanib ketardi va
 * haqiqiy xato ko'rinmay qolardi.
 */
async function loadCategories(id: string) {
  const token = await getAccessToken()
  try {
    const [restaurantRes, categoriesRes] = await Promise.all([
      apiRequest<RestaurantSummary>(`/restaurants/admin/${id}`, { accessToken: token }),
      apiRequest<MenuCategory[]>(`/menu-categories/menu/${id}`, { accessToken: token }),
    ])
    if (!restaurantRes.data) return null
    return {
      restaurant: restaurantRes.data,
      categories: Array.isArray(categoriesRes.data) ? categoriesRes.data : [],
    }
  } catch {
    return null
  }
}

export default async function RestaurantCategoriesPage({ params }: Props) {
  const { id } = await params
  const data = await loadCategories(id)
  if (!data) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/restaurants/${id}/products`}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{data.restaurant.name}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Menyu kategoriyalari · rasmi ilovada do&apos;kon ichidagi
            kategoriya to&apos;rida ko&apos;rinadi
          </p>
        </div>
      </div>

      <CategoriesClient
        restaurant={data.restaurant}
        categories={data.categories}
        scope="admin"
      />
    </div>
  )
}
