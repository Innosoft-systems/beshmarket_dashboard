'use client'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar'
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, User, Star, BarChart2, MessagesSquare, LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutRestaurantAction } from '@/lib/actions/restaurant-auth'

const navItems = [
  { title: 'Bosh sahifa', url: '/restaurant', icon: LayoutDashboard, exact: true },
  { title: 'Buyurtmalar', url: '/restaurant/orders', icon: ShoppingBag },
  { title: 'Menyu', url: '/restaurant/menu', icon: UtensilsCrossed },
  { title: 'Izohlar', url: '/restaurant/reviews', icon: Star },
  { title: 'Statistika', url: '/restaurant/stats', icon: BarChart2 },
  { title: 'Chat', url: '/restaurant/chat', icon: MessagesSquare },
  { title: 'Profil', url: '/restaurant/profile', icon: User },
]

export function RestaurantSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <ShoppingBag className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none">BeshMarket</p>
            <p className="text-xs text-muted-foreground mt-0.5">Restoran paneli</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Asosiy</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.exact ? pathname === item.url : pathname.startsWith(item.url)
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      className={`text-base font-normal py-5 ${isActive ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' : 'text-black'}`}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <form action={logoutRestaurantAction}>
          <button type="submit" className="flex w-full items-center gap-2 rounded-md p-3 text-base text-red-500 hover:bg-red-500/10">
            <LogOut className="h-5 w-5" />
            <span>Chiqish</span>
          </button>
        </form>
      </SidebarFooter>
    </Sidebar>
  )
}
