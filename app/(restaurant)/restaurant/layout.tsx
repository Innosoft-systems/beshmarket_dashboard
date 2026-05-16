import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getAccessToken } from "@/lib/auth/session"
import { getCurrentUser } from "@/lib/auth/current-user"
import { apiRequest } from "@/lib/api/client"
import { RestaurantSidebar } from "@/components/layout/RestaurantSidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export const metadata: Metadata = {
  title: "Restaurant — BeshMarket",
  description: "BeshMarket restoran paneli",
}

export default async function RestaurantLayout({ children }: { children: React.ReactNode }) {
  const token = await getAccessToken()
  const user = await getCurrentUser()

  if (!token || !user) redirect("/restaurant/login")
  if (user.role !== "restaurant") redirect("/dashboard")

  let hasRestaurant = true
  try {
    await apiRequest("/restaurants/my", { accessToken: token })
  } catch {
    hasRestaurant = false
  }

  return (
    <SidebarProvider>
      <RestaurantSidebar />
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden bg-muted/30">
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <span className="text-sm font-medium text-muted-foreground">Restoran paneli</span>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {hasRestaurant ? children : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <h2 className="text-xl font-semibold">Restoran topilmadi</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Sizning akkauntingizga restoran biriktirilmagan. Admin bilan bog'laning.
              </p>
            </div>
          )}
        </div>
      </main>
    </SidebarProvider>
  )
}
