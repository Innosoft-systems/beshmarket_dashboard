import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { RestaurantSidebar } from '@/components/restaurant/RestaurantSidebar'
import { getMyRestaurant } from '@/lib/api/restaurant-cache'
import { redirect } from 'next/navigation'

export default async function RestaurantLayout({ children }: { children: React.ReactNode }) {
  const { restaurant } = await getMyRestaurant()
  if (!restaurant) redirect('/restaurant/login')

  return (
    <SidebarProvider>
      <RestaurantSidebar restaurantName={restaurant.name} />
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden bg-muted/30">
        <header className="flex h-16 shrink-0 items-center border-b bg-background px-4">
          <SidebarTrigger />
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
