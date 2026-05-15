import { Metadata } from "next"
import { getUsers } from "@/lib/api/users"
import { UsersTableClient } from "@/components/users/UsersTableClient"
import { getAccessToken } from "@/lib/auth/session"
import { ApiError } from "@/lib/api/client"

export const metadata: Metadata = {
  title: "Foydalanuvchilar | BeshMarket",
}

interface UsersPageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    role?: string
    is_blocked?: string
  }>
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const accessToken = await getAccessToken()

  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.search || ""
  const role = params.role || ""
  const is_blocked = params.is_blocked || ""

  try {
    const { data: response } = await getUsers(
      {
        page,
        limit: 10,
        ...(search && { search }),
        ...(role && { role }),
        ...(is_blocked && { is_blocked }),
      },
      accessToken,
    )

    return (
      <UsersTableClient
        initialData={response?.data ?? []}
        totalPages={response?.pagination?.totalPages ?? 1}
        currentPage={response?.pagination?.page ?? page}
        filters={{ search, role, is_blocked }}
      />
    )
  } catch (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Foydalanuvchilarni yuklashda xatolik yuz berdi.
        {error instanceof ApiError && (
          <span className="block text-sm mt-1">{error.message}</span>
        )}
      </div>
    )
  }
}
