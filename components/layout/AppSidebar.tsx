"use client"

import { useState } from "react"
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
import { Users, UtensilsCrossed, LayoutDashboard, Settings, LogOut, ShoppingBag, Image, ChevronDown, Truck, UserCog, ClipboardList, Bike, AlertTriangle, MessageSquare, CalendarClock, Bell } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { logoutAction } from "@/app/(auth)/login/actions"

const mainItems = [
  { title: "Bosh sahifa", url: "/dashboard", icon: LayoutDashboard },
  { title: "Buyurtmalar", url: "/orders", icon: ClipboardList },
  { title: "Foydalanuvchilar", url: "/users", icon: Users },
  { title: "Restoranlar", url: "/restaurants", icon: UtensilsCrossed },
  { title: "Kuryerlar", url: "/couriers", icon: Bike },
  { title: "Smenalar", url: "/shifts", icon: CalendarClock },
  { title: "Jarimalar", url: "/penalties", icon: AlertTriangle },
  { title: "Izohlar", url: "/reviews", icon: MessageSquare },
  { title: "Bildirishnoma yuborish", url: "/notifications", icon: Bell },
  { title: "Bannerlar", url: "/banners", icon: Image },
]

const settingsItems = [
  { title: "Foydalanuvchilar", url: "/settings/users", icon: UserCog },
  { title: "Kuryerlar", url: "/settings/couriers", icon: Truck },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith("/settings"))

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <ShoppingBag className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">BeshMarket</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-medium text-muted-foreground">Asosiy</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
                // /dashboard uchun exact match, qolganlar uchun startsWith
                const isActive = item.url === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.url)
                return (
                  <SidebarMenuItem key={item.title}>
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

              {/* Sozlamalar - collapsible */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className={`text-base font-normal py-5 ${pathname.startsWith("/settings") ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' : 'text-black'}`}
                >
                  <Settings />
                  <span className="flex-1">Sozlamalar</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${settingsOpen ? "rotate-180" : ""}`} />
                </SidebarMenuButton>
              </SidebarMenuItem>

              <div className={`overflow-hidden transition-all duration-200 flex flex-col gap-1 ${settingsOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0"}`}>
                {settingsItems.map((item) => {
                  const isActive = pathname.startsWith(item.url)
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        render={<Link href={item.url} />}
                        className={`text-base font-normal py-5 pl-9 ${isActive ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' : 'text-muted-foreground'}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </div>
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
