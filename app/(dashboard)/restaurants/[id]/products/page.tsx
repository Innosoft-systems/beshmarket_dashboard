import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getAccessToken } from "@/lib/auth/session"
import { apiRequest } from "@/lib/api/client"
import { ProductsClient } from "@/components/restaurants/ProductsClient"

export const metadata: Metadata = { title: "Mahsulotlar | BeshMarket" }

interface Props {
  params: Promise<{ id: string }>
}

export default async function RestaurantProductsPage({ params }: Props) {
  const { id } = await params
  const token = await getAccessToken()

  try {
    const [restRes, productsRes, categoriesRes] = await Promise.all([
      apiRequest<any>(`/restaurants/${id}`, { accessToken: token }),
      apiRequest<any>(`/products?restaurant_id=${id}&limit=100`, { accessToken: token }),
      apiRequest<any>(`/menu-categories/menu/${id}`, { accessToken: token }),
    ])

    if (!restRes.data) notFound()

    const products = productsRes.data?.data || productsRes.data || []
    const categories = Array.isArray(categoriesRes.data) ? categoriesRes.data : []

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/restaurants" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{restRes.data.name}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Mahsulotlar boshqaruvi · {products.length} ta mahsulot</p>
          </div>
        </div>

        <ProductsClient
          restaurant={restRes.data}
          products={products}
          categories={categories}
        />
      </div>
    )
  } catch {
    notFound()
  }
}
