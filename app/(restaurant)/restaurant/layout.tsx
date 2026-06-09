import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getAccessToken } from "@/lib/auth/session"
import { RestaurantSidebar } from "@/components/layout/RestaurantSidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { RestaurantSocketProvider } from "@/components/restaurant-panel/RestaurantSocketProvider"
import { RestaurantNotificationBell } from "@/components/layout/RestaurantNotificationBell"
import { MarketVisibilityToggle } from "@/components/restaurant-panel/MarketVisibilityToggle"
import { apiRequest } from "@/lib/api/client"
import type { UnreadCountResponse } from "@/types/api"
import { Restaurant } from "@/types"

export const metadata: Metadata = {
  title: "Restaurant — BeshMarket",
  description: "BeshMarket restoran paneli",
}

export default async function RestaurantLayout({ children }: { children: React.ReactNode }) {
  const token = await getAccessToken()

  if (!token) redirect("/restaurant/login")

  const [unreadRes, restaurantRes] = await Promise.all([
    apiRequest<UnreadCountResponse>('/restaurant-notifications/unread-count', { accessToken: token })
      .catch(() => ({ data: { count: 0 } })),
    apiRequest<Restaurant>('/restaurants/my', { accessToken: token })
      .catch(() => ({ data: null })),
  ])

  const restaurant = restaurantRes.data

  return (
    <SidebarProvider>
      <RestaurantSocketProvider accessToken={token} />
      <RestaurantSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-muted/30">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <div className="flex items-center gap-3">
            {restaurant?.type === "market" && (
              <MarketVisibilityToggle isActive={restaurant.is_active ?? false} />
            )}
            <RestaurantNotificationBell
              accessToken={token}
              initialCount={unreadRes.data?.count ?? 0}
            />
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
