"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ArrowLeft, ShieldCheck, ShieldBan, Power, Check, X, Bike, MapPin, Wallet, Package, Calendar, Trash2, Pencil, FileText, Car } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { COURIER_STATUSES, ORDER_STATUSES } from "@/types"
import { updateCourierAction, blockCourierUserAction, deleteCourierAction, correctionCourierAction, updateDocumentStatusAction, upsertCourierDocumentsAdminAction } from "@/lib/actions/couriers"
import type { CourierDocuments } from "@/types/courier"

interface Props {
  profile: any
  balanceData: { balance: number; transactions: any[] }
  orders?: any[]
  monthlyIncome?: number
  monthlyChart?: { label: string; amount: number; date: string }[]
  weeklyIncome?: number
  documents?: CourierDocuments | null
}

export function CourierDetailClient({ profile, balanceData, orders = [], monthlyIncome = 0, monthlyChart = [], weeklyIncome = 0, documents = null }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const [correctionAmount, setCorrectionAmount] = useState("")
  const [correctionNote, setCorrectionNote] = useState("")
  const [correctionLoading, setCorrectionLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    vehicle_type: profile.vehicle_type,
    vehicle_number: profile.vehicle_number || "",
    city: profile.city,
  })
  const [docsEditOpen, setDocsEditOpen] = useState(false)
  const [docsEditLoading, setDocsEditLoading] = useState(false)
  const [docsForm, setDocsForm] = useState({
    birth_date: documents?.birth_date ? documents.birth_date.substring(0, 10) : "",
    gender: documents?.gender || "",
    address: documents?.address || "",
    passport_series: documents?.passport_series || "",
    passport_number: documents?.passport_number || "",
    passport_issued_date: documents?.passport_issued_date ? documents.passport_issued_date.substring(0, 10) : "",
    passport_expiry_date: documents?.passport_expiry_date ? documents.passport_expiry_date.substring(0, 10) : "",
    driver_license_number: documents?.driver_license_number || "",
    driver_license_expiry: documents?.driver_license_expiry ? documents.driver_license_expiry.substring(0, 10) : "",
  })
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
        <Button variant="outline" onClick={() => setEditOpen(true)} disabled={isPending}>
          <Pencil className="h-4 w-4 mr-2" />
          Tahrirlash
        </Button>
        <Button variant="outline" onClick={() => setCorrectionOpen(true)} disabled={isPending}>
          <Wallet className="h-4 w-4 mr-2" />
          Korreksiya
        </Button>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={isPending}>
          <Trash2 className="h-4 w-4 mr-2" />
          O'chirish
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
            <span className="text-sm">Balans (depozit)</span>
          </div>
          <p className="text-3xl font-bold">{balanceData.balance?.toLocaleString()}<span className="text-base font-normal text-muted-foreground ml-1">so'm</span></p>
          <p className="text-xs text-muted-foreground">Naqd buyurtmalar uchun</p>
        </div>
        <div className="rounded-xl border border-orange-500 bg-background p-5 space-y-2">
          <div className="flex items-center gap-2 text-orange-500">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Oylik daromad</span>
          </div>
          <p className="text-3xl font-bold">{monthlyIncome.toLocaleString()}<span className="text-base font-normal text-muted-foreground ml-1">so'm</span></p>
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

      {/* Hujjatlar */}
      <div className="rounded-xl border border-violet-500 bg-background overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-500" />
            Hujjatlar
          </h3>
          <div className="flex items-center gap-2">
            {documents && (
              <>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  documents.document_status === 'verified' ? 'bg-green-100 text-green-700' :
                  documents.document_status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {documents.document_status === 'verified' ? 'Tasdiqlangan' :
                   documents.document_status === 'rejected' ? 'Rad etilgan' : 'Kutilmoqda'}
                </span>
                {documents.document_status !== 'verified' && (
                  <Button size="sm" variant="outline" className="text-green-700 border-green-300" onClick={async () => {
                    const r = await updateDocumentStatusAction(profile._id, 'verified')
                    if (r.success) { toast.success("Hujjatlar tasdiqlandi"); startTransition(() => router.refresh()) }
                    else toast.error(r.error)
                  }}>
                    <Check className="h-3 w-3 mr-1" /> Tasdiqlash
                  </Button>
                )}
                {documents.document_status !== 'rejected' && (
                  <Button size="sm" variant="outline" className="text-red-700 border-red-300" onClick={async () => {
                    const reason = prompt("Rad etish sababi:")
                    if (reason === null) return
                    const r = await updateDocumentStatusAction(profile._id, 'rejected', reason)
                    if (r.success) { toast.success("Rad etildi"); startTransition(() => router.refresh()) }
                    else toast.error(r.error)
                  }}>
                    <X className="h-3 w-3 mr-1" /> Rad etish
                  </Button>
                )}
              </>
            )}
            <Button size="sm" variant="outline" onClick={() => setDocsEditOpen(true)}>
              <Pencil className="h-3 w-3 mr-1" /> {documents ? "Tahrirlash" : "Qo'shish"}
            </Button>
          </div>
        </div>
        {!documents ? (
          <div className="p-5 text-sm text-muted-foreground">Hujjatlar kiritilmagan</div>
        ) : (
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            {/* Shaxsiy */}
            <div className="space-y-3">
              <p className="font-medium text-muted-foreground uppercase text-xs tracking-wide">Shaxsiy</p>
              {documents.birth_date && (
                <div><span className="text-muted-foreground">Tug&apos;ilgan sana: </span><span className="font-medium">{new Date(documents.birth_date).toLocaleDateString("uz")}</span></div>
              )}
              {documents.gender && (
                <div><span className="text-muted-foreground">Jins: </span><span className="font-medium">{documents.gender === 'male' ? 'Erkak' : 'Ayol'}</span></div>
              )}
              {documents.address && (
                <div><span className="text-muted-foreground">Manzil: </span><span className="font-medium">{documents.address}</span></div>
              )}
            </div>

            {/* Passport */}
            <div className="space-y-3">
              <p className="font-medium text-muted-foreground uppercase text-xs tracking-wide">Passport</p>
              <div><span className="text-muted-foreground">Seriya/raqam: </span><span className="font-medium font-mono">{documents.passport_series} {documents.passport_number}</span></div>
              {documents.passport_issued_date && (
                <div><span className="text-muted-foreground">Berilgan: </span><span className="font-medium">{new Date(documents.passport_issued_date).toLocaleDateString("uz")}</span></div>
              )}
              {documents.passport_expiry_date && (
                <div><span className="text-muted-foreground">Muddati: </span><span className="font-medium">{new Date(documents.passport_expiry_date).toLocaleDateString("uz")}</span></div>
              )}
              {(documents.passport_photo_front || documents.passport_photo_back) && (
                <div className="flex gap-2 pt-1">
                  {documents.passport_photo_front && (
                    <a href={documents.passport_photo_front} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Old rasm</a>
                  )}
                  {documents.passport_photo_back && (
                    <a href={documents.passport_photo_back} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Orqa rasm</a>
                  )}
                </div>
              )}
            </div>

            {/* Haydovchilik */}
            <div className="space-y-3">
              <p className="font-medium text-muted-foreground uppercase text-xs tracking-wide flex items-center gap-1"><Car className="h-3 w-3" /> Haydovchilik</p>
              {documents.driver_license_number ? (
                <>
                  <div><span className="text-muted-foreground">Guvohnoma №: </span><span className="font-medium font-mono">{documents.driver_license_number}</span></div>
                  {documents.driver_license_expiry && (
                    <div><span className="text-muted-foreground">Muddati: </span><span className="font-medium">{new Date(documents.driver_license_expiry).toLocaleDateString("uz")}</span></div>
                  )}
                  {documents.driver_license_photo && (
                    <a href={documents.driver_license_photo} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Foto</a>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground text-xs">Kiritilmagan</span>
              )}
            </div>

            {documents.rejection_reason && (
              <div className="col-span-full text-xs text-red-600 bg-red-50 p-3 rounded-lg">
                Rad etish sababi: {documents.rejection_reason}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Buyurtmalar tarixi */}
      {orders.length > 0 && (
        <div className="rounded-xl border border-slate-300 bg-background overflow-hidden">
          <div className="p-5 border-b">
            <h3 className="font-semibold flex items-center gap-2"><Package className="h-5 w-5 text-blue-500" /> Buyurtmalar tarixi ({orders.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="h-11 px-5 text-left font-medium">Buyurtma №</th>
                  <th className="h-11 px-5 text-left font-medium">Restoran</th>
                  <th className="h-11 px-5 text-left font-medium">Status</th>
                  <th className="h-11 px-5 text-right font-medium">Summa</th>
                  <th className="h-11 px-5 text-right font-medium">Sana</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 20).map((order: any, i: number) => {
                  const statusInfo = ORDER_STATUSES.find((s) => s.value === order.status)
                  return (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium">{order.order_number}</td>
                      <td className="px-5 py-3">{order.restaurant_id?.name || "—"}</td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={statusInfo?.color || ""}>{statusInfo?.label || order.status}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right">{order.total?.toLocaleString()} so'm</td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("uz")}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Oylik daromadlar */}
      {monthlyChart.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><Wallet className="h-5 w-5 text-green-500" /> Oylik daromadlar</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Naqd offline to'lanadi</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {monthlyChart.map((item, i) => (
              <div key={i} className="rounded-lg border bg-background p-3 text-center">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-bold text-green-600 mt-1">{item.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correction Dialog */}
      {correctionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-lg ring-1 ring-foreground/10 space-y-4">
            <h3 className="text-base font-medium">Balans korreksiyasi</h3>
            <p className="text-sm text-muted-foreground">Musbat son — balans oshiradi. Manfiy son — kamaytiradi.</p>
            <div className="space-y-2">
              <Label>Miqdor (so'm)</Label>
              <Input
                type="number"
                placeholder="+50000 yoki -20000"
                value={correctionAmount}
                onChange={(e) => setCorrectionAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Sabab</Label>
              <Input
                placeholder="Korreksiya sababi..."
                value={correctionNote}
                onChange={(e) => setCorrectionNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setCorrectionOpen(false); setCorrectionAmount(""); setCorrectionNote("") }}>Bekor qilish</Button>
              <Button
                disabled={correctionLoading || !correctionAmount || !correctionNote}
                onClick={async () => {
                  const amt = Number(correctionAmount)
                  if (!amt || !correctionNote.trim()) return
                  setCorrectionLoading(true)
                  const result = await correctionCourierAction(profile._id, amt, correctionNote.trim())
                  setCorrectionLoading(false)
                  if (result.success) {
                    toast.success("Korreksiya qo'shildi")
                    setCorrectionOpen(false)
                    setCorrectionAmount("")
                    setCorrectionNote("")
                    startTransition(() => router.refresh())
                  } else toast.error(result.error)
                }}
              >{correctionLoading ? "Saqlanmoqda..." : "Saqlash"}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-lg ring-1 ring-foreground/10 space-y-4">
            <h3 className="text-base font-medium">Profil ma'lumotlarini tahrirlash</h3>
            <div className="space-y-2">
              <Label>Transport turi</Label>
              <Select value={editForm.vehicle_type} onValueChange={(v) => setEditForm({ ...editForm, vehicle_type: v ?? editForm.vehicle_type })}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {({ bicycle: "Velosiped", motorcycle: "Mototsikl", car: "Avtomobil", on_foot: "Piyoda" } as Record<string, string>)[editForm.vehicle_type] || editForm.vehicle_type}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bicycle">Velosiped</SelectItem>
                  <SelectItem value="motorcycle">Mototsikl</SelectItem>
                  <SelectItem value="car">Avtomobil</SelectItem>
                  <SelectItem value="on_foot">Piyoda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Transport raqami</Label>
              <Input value={editForm.vehicle_number} onChange={(e) => setEditForm({ ...editForm, vehicle_number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Shahar</Label>
              <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Bekor qilish</Button>
              <Button onClick={async () => {
                const result = await updateCourierAction(profile._id, editForm)
                if (result.success) {
                  toast.success("Saqlandi")
                  setEditOpen(false)
                  startTransition(() => router.refresh())
                } else toast.error(result.error)
              }}>Saqlash</Button>
            </div>
          </div>
        </div>
      )}

      {/* Hujjatlar tahrirlash modali */}
      {docsEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">
          <div className="bg-background rounded-xl p-6 w-full max-w-lg shadow-lg ring-1 ring-foreground/10 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-medium">Hujjatlar</h3>

            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Shaxsiy</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tug&apos;ilgan sana</Label>
                  <Input type="date" value={docsForm.birth_date} onChange={(e) => setDocsForm({ ...docsForm, birth_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Jins</Label>
                  <Select value={docsForm.gender} onValueChange={(v) => setDocsForm({ ...docsForm, gender: v ?? "" })}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{docsForm.gender === "male" ? "Erkak" : docsForm.gender === "female" ? "Ayol" : "Tanlang..."}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Erkak</SelectItem>
                      <SelectItem value="female">Ayol</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Yashash manzili</Label>
                <Input value={docsForm.address} onChange={(e) => setDocsForm({ ...docsForm, address: e.target.value })} placeholder="Toshkent sh., Yunusobod tumani, ..." />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Passport</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Seriya</Label>
                  <Input value={docsForm.passport_series} onChange={(e) => setDocsForm({ ...docsForm, passport_series: e.target.value.toUpperCase() })} placeholder="AA" maxLength={2} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Raqam</Label>
                  <Input value={docsForm.passport_number} onChange={(e) => setDocsForm({ ...docsForm, passport_number: e.target.value })} placeholder="1234567" maxLength={7} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Berilgan sana</Label>
                  <Input type="date" value={docsForm.passport_issued_date} onChange={(e) => setDocsForm({ ...docsForm, passport_issued_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Muddati</Label>
                  <Input type="date" value={docsForm.passport_expiry_date} onChange={(e) => setDocsForm({ ...docsForm, passport_expiry_date: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Haydovchilik guvohnomasi</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Guvohnoma №</Label>
                  <Input value={docsForm.driver_license_number} onChange={(e) => setDocsForm({ ...docsForm, driver_license_number: e.target.value })} placeholder="12AB345678" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Muddati</Label>
                  <Input type="date" value={docsForm.driver_license_expiry} onChange={(e) => setDocsForm({ ...docsForm, driver_license_expiry: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDocsEditOpen(false)} disabled={docsEditLoading}>Bekor qilish</Button>
              <Button
                disabled={docsEditLoading || (!docsForm.passport_series.trim() && !docsForm.birth_date && !docsForm.address && !docsForm.gender && !docsForm.driver_license_number)}
                onClick={async () => {
                  if (docsForm.passport_series.trim() !== docsForm.passport_number.trim() &&
                    (!!docsForm.passport_series.trim() !== !!docsForm.passport_number.trim())) {
                    toast.error("Passport seriya va raqam birga kiritilishi kerak")
                    return
                  }
                  const payload: Record<string, string> = {}
                  if (docsForm.birth_date) payload.birth_date = docsForm.birth_date
                  if (docsForm.gender) payload.gender = docsForm.gender
                  if (docsForm.address.trim()) payload.address = docsForm.address.trim()
                  if (docsForm.passport_series.trim()) payload.passport_series = docsForm.passport_series.trim()
                  if (docsForm.passport_number.trim()) payload.passport_number = docsForm.passport_number.trim()
                  if (docsForm.passport_issued_date) payload.passport_issued_date = docsForm.passport_issued_date
                  if (docsForm.passport_expiry_date) payload.passport_expiry_date = docsForm.passport_expiry_date
                  if (docsForm.driver_license_number.trim()) payload.driver_license_number = docsForm.driver_license_number.trim()
                  if (docsForm.driver_license_expiry) payload.driver_license_expiry = docsForm.driver_license_expiry

                  setDocsEditLoading(true)
                  const r = await upsertCourierDocumentsAdminAction(profile._id, payload as any)
                  setDocsEditLoading(false)
                  if (r.success) {
                    toast.success("Hujjatlar saqlandi")
                    setDocsEditOpen(false)
                    startTransition(() => router.refresh())
                  } else {
                    toast.error(r.error)
                  }
                }}
              >{docsEditLoading ? "Saqlanmoqda..." : "Saqlash"}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Kuryerni o'chirish"
        description={`${user?.full_name || user?.phone} ni o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.`}
        confirmLabel="O'chirish"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={async () => {
          setDeleteLoading(true)
          const result = await deleteCourierAction(profile._id)
          setDeleteLoading(false)
          if (result.success) {
            toast.success("Kuryer o'chirildi")
            router.push("/couriers")
          } else toast.error(result.error)
        }}
      />
    </div>
  )
}
