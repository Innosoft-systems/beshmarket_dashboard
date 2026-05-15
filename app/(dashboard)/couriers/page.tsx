import { Metadata } from "next"
import { getCouriers } from "@/lib/api/couriers"
import { CouriersClient } from "@/components/couriers/CouriersClient"
import { getAccessToken } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Kuryerlar | BeshMarket",
}

export default async function CouriersPage() {
  const accessToken = await getAccessToken()

  try {
    const { data } = await getCouriers(accessToken)
    return <CouriersClient couriers={data ?? []} accessToken={accessToken || ""} />
  } catch {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Kuryerlarni yuklashda xatolik yuz berdi.
      </div>
    )
  }
}
