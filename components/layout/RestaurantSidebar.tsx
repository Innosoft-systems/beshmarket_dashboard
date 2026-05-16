"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Percent,
  Settings,
  Star,
  Store,
  UtensilsCrossed,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { logoutAction } from "@/lib/actions/auth"

const items = [
  { title: "Bosh sahifa", url: "/restaurant", icon: LayoutDashboard },
  { title: "Buyurtmalar", url: "/restaurant/orders", icon: ClipboardList },
  { title: "Menyu", url: "/restaurant/menu", icon: UtensilsCrossed },
  { title: "Izohlar", url: "/restaurant/reviews", icon: Star },
  { title: "Promo kodlar", url: "/restaurant/promotions", icon: Percent },
  { title: "Profil", url: "/restaurant/profile", icon: Settings },
  { title: "Ish vaqti", url: "/restaurant/working-hours", icon: CalendarClock },
]

export function RestaurantSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Store className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">Restaurant</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-medium text-muted-foreground">Panel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = item.url === "/restaurant"
                  ? pathname === "/restaurant"
                  : pathname.startsWith(item.url)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      className={`text-base font-normal py-5 ${
                        isActive
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                          : "text-black"
                      }`}
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
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md p-3 text-base text-red-500 hover:bg-red-500/10"
          >
            <LogOut className="h-5 w-5" />
            <span>Chiqish</span>
          </button>
        </form>
      </SidebarFooter>
    </Sidebar>
  )
}
