"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { ArrowLeft, ShieldCheck, ShieldBan, Power, Check, X, Bike, MapPin, Star, Wallet, Package, Calendar } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { COURIER_STATUSES } from "@/types"
import { updateCourierAction, blockCourierUserAction } from "@/lib/actions/couriers"

interface Props {
  profile: any
  balanceData: { balance: number; transactions: any[] }
}

export function CourierDetailClient({ profile, balanceData }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const user = profile.user_id
  const statusInfo = COURIER_STATUSES.find((s) => s.value === profile.status)

  const toggleVerify = async () => {
    const result = await updateCourierAction(profile._id, { is_verified: !profile.is_verified })
    if (result.success) {
      toast.success(profile.is_verified ? "Tasdiqlash olib tashlandi" : "Kuryer tasdiqlandi")
      startTransition(() => router.refresh())
    } else toast.error(result.error)
  }

  const toggleActive = async () => {
    const result = await updateCourierAction(profile._id, { is_active: !profile.is_active })
    if (result.success) {
      toast.success(profile.is_active ? "Kuryer nofaol qilindi" : "Kuryer faol qilindi")
      startTransition(() => router.refresh())
    } else toast.error(result.error)
  }

  const toggleBlock = async () => {
    const userId = typeof user === "object" ? user._id : user
    const isBlocked = user?.is_blocked
    const result = await blockCourierUserAction(userId, !isBlocked)
    if (result.success) {
      toast.success(isBlocked ? "Blokdan chiqarildi" : "Bloklandi")
      startTransition(() => router.refresh())
    } else toast.error(result.error)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{user?.full_name || "Noma'lum"}</h1>
            <Badge variant="outline" className={statusInfo?.color || ""}>{statusInfo?.label || profile.status}</Badge>
            {profile.is_verified && <Badge className="bg-primary/10 text-primary border-primary/20">Tasdiqlangan</Badge>}
          </div>
          <p className="text-muted-foreground mt-1">{user?.phone}</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/couriers")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Orqaga
        </Button>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 p-4 rounded-lg border bg-muted/30">
        <Button variant={profile.is_verified ? "outline" : "default"} onClick={toggleVerify} disabled={isPending}>
          <ShieldCheck className="h-4 w-4 mr-2" />
          {profile.is_verified ? "Tasdiqlashni bekor qilish" : "Tasdiqlash"}
        </Button>
        <Button variant="outline" onClick={toggleActive} disabled={isPending}>
          <Power className="h-4 w-4 mr-2" />
          {profile.is_active ? "Nofaol qilish" : "Faol qilish"}
        </Button>
        <Button variant={user?.is_blocked ? "outline" : "destructive"} onClick={toggleBlock} disabled={isPending}>
          <ShieldBan className="h-4 w-4 mr-2" />
          {user?.is_blocked ? "Blokdan chiqarish" : "Bloklash"}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-blue-500 bg-background p-5 space-y-2">
          <div className="flex items-center gap-2 text-blue-500">
            <Package className="h-4 w-4" />
            <span className="text-sm">Yetkazishlar</span>
          </div>
          <p className="text-3xl font-bold">{profile.total_deliveries}</p>
        </div>
        <div className="rounded-xl border border-green-500 bg-background p-5 space-y-2">
          <div className="flex items-center gap-2 text-green-500">
            <Wallet className="h-4 w-4" />
            <span className="text-sm">Jami daromad</span>
          </div>
          <p className="text-3xl font-bold">{profile.total_earned?.toLocaleString()}<span className="text-base font-normal text-muted-foreground ml-1">so'm</span></p>
        </div>
        <div className="rounded-xl border border-purple-500 bg-background p-5 space-y-2">
          <div className="flex items-center gap-2 text-purple-500">
            <Wallet className="h-4 w-4" />
            <span className="text-sm">Balans</span>
          </div>
          <p className="text-3xl font-bold">{balanceData.balance?.toLocaleString()}<span className="text-base font-normal text-muted-foreground ml-1">so'm</span></p>
        </div>
        <div className="rounded-xl border border-amber-500 bg-background p-5 space-y-2">
          <div className="flex items-center gap-2 text-amber-500">
            <Star className="h-4 w-4" />
            <span className="text-sm">Reyting</span>
          </div>
          <p className="text-3xl font-bold">{profile.avg_rating ? profile.avg_rating.toFixed(1) : "—"}<span className="text-base font-normal text-muted-foreground ml-1">({profile.review_count || 0})</span></p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-cyan-500 bg-background p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Bike className="h-5 w-5 text-cyan-500" /> Ma'lumotlar</h3>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span className="text-muted-foreground">Transport</span>
            <span className="font-medium capitalize">{profile.vehicle_type}</span>
            {profile.vehicle_number && <>
              <span className="text-muted-foreground">Raqam</span>
              <span className="font-medium">{profile.vehicle_number}</span>
            </>}
            <span className="text-muted-foreground">Shahar</span>
            <span className="font-medium">{profile.city}</span>
            <span className="text-muted-foreground">Ro'yxatdan o'tgan</span>
            <span className="font-medium">{new Date(profile.createdAt).toLocaleDateString("uz")}</span>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500 bg-background p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><MapPin className="h-5 w-5 text-emerald-500" /> Holat</h3>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span className="text-muted-foreground">Tasdiqlangan</span>
            <span>{profile.is_verified ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-500" />}</span>
            <span className="text-muted-foreground">Faol</span>
            <span>{profile.is_active ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-500" />}</span>
            <span className="text-muted-foreground">Bloklangan</span>
            <span>{user?.is_blocked ? <ShieldBan className="h-4 w-4 text-red-500" /> : <Check className="h-4 w-4 text-green-600" />}</span>
            <span className="text-muted-foreground">Bugungi rad etishlar</span>
            <span className="font-medium">{profile.rejections_today || 0}</span>
          </div>
        </div>
      </div>

      {/* Balans tarixi */}
      {balanceData.transactions?.length > 0 && (
        <div className="rounded-xl border border-indigo-500 bg-background overflow-hidden">
          <div className="p-5 border-b">
            <h3 className="font-semibold flex items-center gap-2"><Calendar className="h-5 w-5 text-indigo-500" /> Balans tarixi</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="h-11 px-5 text-left font-medium">Turi</th>
                  <th className="h-11 px-5 text-left font-medium">Tavsif</th>
                  <th className="h-11 px-5 text-right font-medium">Summa</th>
                  <th className="h-11 px-5 text-right font-medium">Sana</th>
                </tr>
              </thead>
              <tbody>
                {balanceData.transactions.slice(0, 20).map((tx: any, i: number) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3">
                      <Badge variant="outline" className={
                        tx.type === "earning" ? "bg-green-100 text-green-500 border-green-200" :
                        tx.type === "penalty" ? "bg-red-100 text-red-700 border-red-200" :
                        "bg-blue-100 text-blue-500 border-blue-200"
                      }>
                        {tx.type === "earning" ? "Daromad" : tx.type === "penalty" ? "Jarima" : "Yechish"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{tx.description || "—"}</td>
                    <td className={`px-5 py-3 text-right font-semibold ${tx.type === "penalty" || tx.type === "withdrawal" ? "text-red-600" : "text-green-600"}`}>
                      {tx.type === "penalty" || tx.type === "withdrawal" ? "-" : "+"}{tx.amount?.toLocaleString()} so'm
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString("uz")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
