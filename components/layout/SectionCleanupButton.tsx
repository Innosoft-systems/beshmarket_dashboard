"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { cleanupSectionAction } from "@/lib/actions/admin-cleanup"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface CleanupConfig {
  resource: string
  label: string
  restaurantId?: string
}

const EXACT_SECTIONS: Record<string, CleanupConfig> = {
  "/orders": { resource: "orders", label: "buyurtmalar" },
  "/users": { resource: "users", label: "mijoz foydalanuvchilar" },
  "/restaurants": { resource: "restaurants", label: "restoranlar" },
  "/couriers": { resource: "couriers", label: "kuryerlar" },
  "/shifts": { resource: "shifts", label: "smenalar" },
  "/penalties": { resource: "penalties", label: "jarimalar" },
  "/payments": { resource: "payments", label: "to'lovlar" },
  "/reviews": { resource: "reviews", label: "izohlar" },
  "/promotions": { resource: "promotions", label: "promo kodlar" },
  "/chat": { resource: "chat", label: "chat xabarlari" },
  "/banners": { resource: "banners", label: "bannerlar" },
  "/settings/zones": { resource: "service-zones", label: "xizmat zonalari" },
  "/settings/app-versions": { resource: "app-versions", label: "ilova versiyalari" },
  "/settlements": { resource: "settlements", label: "hisob-kitoblar" },
}

function getCleanupConfig(pathname: string, tab: string | null): CleanupConfig | null {
  if (pathname === "/notifications") {
    return tab === "history"
      ? { resource: "admin-notifications", label: "bildirishnomalar tarixi" }
      : { resource: "notifications", label: "yuborilgan bildirishnomalar" }
  }

  const productMatch = pathname.match(/^\/restaurants\/([a-f\d]{24})\/products$/i)
  if (productMatch) {
    return { resource: "products", label: "mahsulotlar", restaurantId: productMatch[1] }
  }

  return EXACT_SECTIONS[pathname] ?? null
}

export function SectionCleanupButton() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const config = getCleanupConfig(pathname, searchParams.get("tab"))

  if (!config) return null

  const handleConfirm = async () => {
    const result = await cleanupSectionAction(config.resource, pathname, config.restaurantId)
    if (!result.success) {
      toast.error(result.error)
      return
    }

    setOpen(false)
    toast.success(`${result.deletedCount ?? 0} ta yozuv o'chirildi`)
    startTransition(() => router.refresh())
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isPending}
      >
        <Trash2 className="h-4 w-4" />
        <span className="hidden sm:inline">Tozalash</span>
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`${config.label.charAt(0).toUpperCase()}${config.label.slice(1)}ni tozalash`}
        description={`Rostdan ham ${config.label}ni tozalashni xohlaysizmi? Barcha ${config.label} o'chib ketadi. Bu amalni ortga qaytarib bo'lmaydi.`}
        confirmLabel="Ha, barchasini o'chirish"
        loading={isPending}
        onConfirm={() => startTransition(handleConfirm)}
      />
    </>
  )
}
