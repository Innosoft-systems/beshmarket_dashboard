import { Metadata } from "next"
import { getUsers } from "@/lib/api/users"
import { UsersTableClient } from "@/components/users/UsersTableClient"
import { getAccessToken } from "@/lib/auth/session"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Foydalanuvchilar | BeshMarket",
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    redirect("/login")
  }

  const params = await searchParams;
  const page = Number(params.page) || 1
  
  try {
    const { data: response } = await getUsers({ page, limit: 10 }, accessToken)
    
    return (
      <UsersTableClient 
        initialData={response.data} 
        totalPages={response.pagination.totalPages} 
        currentPage={response.pagination.page} 
      />
    )
  } catch (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Foydalanuvchilarni yuklashda xatolik yuz berdi.
      </div>
    )
  }
}
