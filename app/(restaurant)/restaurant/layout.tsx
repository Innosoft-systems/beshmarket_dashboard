import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getAccessToken } from "@/lib/auth/session"
import { getCurrentUser } from "@/lib/auth/current-user"
import { Bell } from "lucide-react"
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

  return (
    <SidebarProvider>
      <RestaurantSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-muted/30">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <a href="/restaurant/notifications" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </a>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
