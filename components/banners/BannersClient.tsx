"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { Banner } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { BannerFormDialog } from "@/components/banners/BannerFormDialog"
import { deleteBannerAction, updateBannerAction } from "@/lib/actions/banners"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

interface BannersClientProps {
  banners: Banner[]
}

export function BannersClient({ banners }: BannersClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formOpen, setFormOpen] = useState(false)
  const [editBanner, setEditBanner] = useState<Banner | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const refresh = () => startTransition(() => router.refresh())

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    const result = await deleteBannerAction(deleteId)
    setDeleteLoading(false)
    setDeleteId(null)
    if (result.success) {
      toast.success("Banner o'chirildi")
      refresh()
    } else {
      toast.error(result.error || "Xatolik yuz berdi")
    }
  }

  const toggleActive = async (banner: Banner) => {
    const result = await updateBannerAction(banner._id, { is_active: !banner.is_active })
    if (result.success) {
      toast.success(banner.is_active ? "Banner nofaol qilindi" : "Banner faol qilindi")
      refresh()
    } else {
      toast.error(result.error || "Xatolik yuz berdi")
    }
  }

  const columns: ColumnDef<Banner>[] = [
    {
      accessorKey: "sort_order",
      header: "#",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("sort_order")}</span>,
    },
    {
      accessorKey: "image",
      header: "Rasm",
      cell: ({ row }) => (
        <div className="h-12 w-20 rounded overflow-hidden border">
          <img src={`${API_URL}${row.getValue("image")}`} alt="" className="h-full w-full object-cover" />
        </div>
      ),
    },
    {
      accessorKey: "title_uz",
      header: "Sarlavha (UZ)",
      cell: ({ row }) => <span className="font-medium">{row.getValue("title_uz")}</span>,
    },
    {
      accessorKey: "title_ru",
      header: "Sarlavha (RU)",
    },
    {
      accessorKey: "title_en",
      header: "Sarlavha (EN)",
    },
    {
      accessorKey: "link",
      header: "Havola",
      cell: ({ row }) => {
        const link = row.getValue("link") as string
        return link ? <span className="text-blue-600 text-xs truncate max-w-[120px] block">{link}</span> : <span className="text-muted-foreground">—</span>
      },
    },
    {
      accessorKey: "is_active",
      header: "Holati",
      cell: ({ row }) => {
        const active = row.getValue("is_active") as boolean
        return (
          <Badge
            className={`cursor-pointer ${active ? "bg-green-100 text-green-700 border-green-200" : ""}`}
            variant={active ? "outline" : "destructive"}
            onClick={() => toggleActive(row.original)}
          >
            {active ? "Faol" : "Nofaol"}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditBanner(row.original); setFormOpen(true) }}>
              <Pencil className="h-4 w-4 mr-2" />
              Tahrirlash
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteId(row.original._id)} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              O'chirish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium tracking-tight">Bannerlar</h1>
        <Button onClick={() => { setEditBanner(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" />
          Yangi banner
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={banners}
        pageCount={1}
        currentPage={1}
        onPageChange={() => {}}
        isLoading={isPending}
      />

      <BannerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        banner={editBanner}
        onSuccess={refresh}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => { if (!v) setDeleteId(null) }}
        title="Bannerni o'chirish"
        description="Bu bannerni o'chirishni xohlaysizmi?"
        confirmLabel="O'chirish"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </div>
  )
}
