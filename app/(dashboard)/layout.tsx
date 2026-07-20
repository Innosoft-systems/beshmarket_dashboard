import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAccessToken } from '@/lib/auth/session';
import { apiRequest } from '@/lib/api/client'
import type { UnreadCountResponse } from '@/types/api';
import { AppSidebar } from "@/components/layout/AppSidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { ChatBell } from "@/components/layout/ChatBell"
import { SectionCleanupButton } from "@/components/layout/SectionCleanupButton"

export const metadata: Metadata = {
  title: 'Dashboard — BeshMarket',
  description: 'BeshMarket boshqaruv paneli',
};

function decodeJwtUserId(token: string): string | undefined {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'))
    return payload.userId ?? payload.sub ?? undefined
  } catch {
    return undefined
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const token = await getAccessToken()

  // If no token at all, middleware should have caught this — but safety fallback
  if (!token) redirect("/login")

  const currentUserId = decodeJwtUserId(token)

  const [unreadRes, chatUnreadRes] = await Promise.all([
    apiRequest<UnreadCountResponse>('/admin-notifications/unread-count', { accessToken: token })
      .catch(() => ({ data: { count: 0 } })),
    apiRequest<UnreadCountResponse>('/chat/unread-count', { accessToken: token })
      .catch(() => ({ data: { count: 0 } })),
  ])

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden bg-muted/30">
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <div className="flex items-center gap-1">
            <SectionCleanupButton />
            <ChatBell
              accessToken={token || ""}
              initialUnread={chatUnreadRes.data?.count ?? 0}
            />
            <NotificationBell
              accessToken={token || ""}
              initialCount={unreadRes.data?.count ?? 0}
              currentUserId={currentUserId}
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
