import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getAccessToken } from "@/lib/auth/session"
import { getUser } from "@/lib/api/users"
import { getOrders } from "@/lib/api/orders"
import { ApiError } from "@/lib/api/client"
import { UserDetailClient } from "@/components/users/UserDetailClient"

export const metadata: Metadata = {
  title: "Foydalanuvchi | BeshMarket",
}

const ORDERS_PER_PAGE = 20

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function UserDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const page = Number((await searchParams).page) || 1
  const accessToken = await getAccessToken()

  // notFound() throws, so it stays outside the try that renders the error box.
  let result
  try {
    result = await Promise.all([
      getUser(id, accessToken),
      getOrders({ client_id: id, page, limit: ORDERS_PER_PAGE }, accessToken),
    ])
  } catch (error) {
    if (error instanceof ApiError && (error.statusCode === 404 || error.statusCode === 400)) notFound()
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Foydalanuvchi ma&apos;lumotlarini yuklashda xatolik yuz berdi.
        {error instanceof ApiError && (
          <span className="block text-sm mt-1">{error.message}</span>
        )}
      </div>
    )
  }

  const [{ data: user }, { data: orders }] = result
  if (!user) notFound()

  return (
    <UserDetailClient
      user={user}
      orders={orders?.data ?? []}
      totalPages={orders?.pagination?.totalPages ?? 1}
      currentPage={orders?.pagination?.page ?? page}
    />
  )
}
