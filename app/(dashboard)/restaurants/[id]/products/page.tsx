import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { ProductsClient } from "@/components/restaurants/ProductsClient"
import {
  PRODUCTS_PAGE_SIZE,
  type ProductCategoryCounts,
  type ProductsPage,
} from "@/lib/products-list"

export const metadata: Metadata = { title: "Mahsulotlar | BeshMarket" }

interface Props {
  params: Promise<{ id: string }>
}

const EMPTY_PAGE: ProductsPage = {
  data: [],
  pagination: { page: 1, totalPages: 1, total: 0 },
}

export default async function RestaurantProductsPage({ params }: Props) {
  const { id } = await params
  const token = await getAccessToken()

  try {
    // Only the first page is rendered here; the rest arrives as the table is
    // scrolled. The counts come from the database over the whole menu — the
    // page used to fetch 100 rows and count those, so a larger menu reported
    // the size of its first page.
    const [restRes, productsRes, categoriesRes, countsRes] = await Promise.all([
      apiRequest<any>(`/restaurants/admin/${id}`, { accessToken: token }),
      apiRequest<ProductsPage>(
        `/products/admin?restaurant_id=${id}&page=1&limit=${PRODUCTS_PAGE_SIZE}`,
        { accessToken: token },
      ),
      apiRequest<any>(`/menu-categories/menu/${id}`, { accessToken: token }),
      apiRequest<ProductCategoryCounts>(
        `/products/admin/category-counts?restaurant_id=${id}`,
        { accessToken: token },
      ),
    ])

    if (!restRes.data) notFound()

    const initial = productsRes.data ?? EMPTY_PAGE
    const categories = Array.isArray(categoriesRes.data) ? categoriesRes.data : []
    const counts = countsRes.data ?? { total: 0, uncategorized: 0, by_category: {} }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/restaurants" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{restRes.data.name}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Mahsulotlar boshqaruvi · {counts.total} ta mahsulot
            </p>
          </div>
        </div>

        <ProductsClient
          restaurant={restRes.data}
          initial={initial}
          counts={counts}
          categories={categories}
        />
      </div>
    )
  } catch {
    notFound()
  }
}
