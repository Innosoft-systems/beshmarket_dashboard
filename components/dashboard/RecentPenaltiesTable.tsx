"use client"

import Link from "next/link"
import { AlertTriangle, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const REASON_LABELS: Record<string, string> = {
  cancellation: "Smena bekor",
  no_show: "Kelmagan",
  order_reject: "Rad etish",
}

interface Props {
  penalties: any[]
}

export function RecentPenaltiesTable({ penalties }: Props) {
  return (
    <div className="rounded-xl border bg-background overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Oxirgi jarimalar
        </h3>
        <Link href="/penalties" className="text-xs text-primary hover:underline flex items-center gap-1">
          Barchasini ko'rish <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {penalties.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Jarimalar yo'q</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="h-9 px-4 text-left text-xs font-medium text-muted-foreground">Kuryer</th>
              <th className="h-9 px-4 text-left text-xs font-medium text-muted-foreground">Sabab</th>
              <th className="h-9 px-4 text-right text-xs font-medium text-muted-foreground">Miqdor</th>
              <th className="h-9 px-4 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="h-9 px-4 text-right text-xs font-medium text-muted-foreground">Sana</th>
            </tr>
          </thead>
          <tbody>
            {penalties.map((p: any) => (
              <tr key={p._id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5 text-xs font-medium">{p.courier_id?.full_name || p.courier_id?.phone || "—"}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className="text-xs px-1.5 py-0 gap-1">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {REASON_LABELS[p.reason] || p.reason}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-right text-xs font-semibold text-red-600">
                  {p.amount?.toLocaleString()} so'm
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className={`text-xs px-1.5 py-0 ${
                    p.status === "pending" ? "bg-amber-100 text-amber-700 border-amber-200" :
                    p.status === "deducted" ? "bg-red-100 text-red-700 border-red-200" :
                    "bg-green-100 text-green-700 border-green-200"
                  }`}>
                    {p.status === "pending" ? "Kutilmoqda" : p.status === "deducted" ? "Yechildi" : "Bekor"}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                  {new Date(p.createdAt).toLocaleDateString("uz")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
