'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const DAYS = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba']

export function RestaurantProfileClient({ restaurant, workingHours, accessToken }: { restaurant: any; workingHours: any[]; accessToken: string }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [tab, setTab] = useState('info')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState('')
  const [info, setInfo] = useState({
    name: restaurant.name || '', phone: restaurant.phone || '', address: restaurant.address || '',
    city: restaurant.city || '', district: restaurant.district || '', description: restaurant.description || '',
    min_order_amount: String(restaurant.min_order_amount || 0), delivery_fee: String(restaurant.delivery_fee || 0), avg_prep_time: String(restaurant.avg_prep_time || 30),
  })
  const [hours, setHours] = useState(Array.from({ length: 7 }, (_, i) => {
    const found = workingHours.find(h => h.day_of_week === i + 1)
    return found ? { ...found } : { day_of_week: i + 1, open_time: '09:00', close_time: '22:00', is_closed: false }
  }))

  const saveInfo = async () => {
    setSaving(true)
    const res = await fetch(`${API_URL}/api/v1/restaurants/${restaurant._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ ...info, min_order_amount: +info.min_order_amount, delivery_fee: +info.delivery_fee, avg_prep_time: +info.avg_prep_time }),
    })
    setSaving(false)
    if (res.ok) { toast.success('Saqlandi'); startTransition(() => router.refresh()) } else toast.error('Xatolik')
  }

  const uploadImage = async (file: File, field: 'logo' | 'cover_image') => {
    setUploading(field)
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch(`${API_URL}/api/v1/upload/image`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: fd })
    if (res.ok) {
      const json = await res.json()
      const url = `${API_URL}${json.data?.url || json.url}`
      await fetch(`${API_URL}/api/v1/restaurants/${restaurant._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ [field]: url }) })
      toast.success('Yuklandi'); startTransition(() => router.refresh())
    } else toast.error('Xatolik')
    setUploading('')
  }

  const saveHours = async () => {
    setSaving(true)
    const res = await fetch(`${API_URL}/api/v1/restaurants/my/working-hours`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ hours }),
    })
    setSaving(false)
    if (res.ok) { toast.success('Saqlandi'); startTransition(() => router.refresh()) } else toast.error('Xatolik')
  }

  const TABS = [{ id: 'info', label: 'Asosiy' }, { id: 'media', label: 'Logo & Rasm' }, { id: 'hours', label: 'Ish vaqtlari' }]

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Profil</h1>

      <div className="flex gap-1 border-b border-border">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <Card><CardContent className="pt-5 space-y-4 max-w-2xl">
          {[['Restoran nomi', 'name'], ['Telefon', 'phone'], ['Manzil', 'address']].map(([label, key]) => (
            <div key={key}>
              <label className="text-sm font-medium mb-1.5 block">{label}</label>
              <Input value={(info as any)[key]} onChange={e => setInfo({ ...info, [key]: e.target.value })} />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium mb-1.5 block">Shahar</label><Input value={info.city} onChange={e => setInfo({ ...info, city: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Tuman</label><Input value={info.district} onChange={e => setInfo({ ...info, district: e.target.value })} /></div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Tavsif</label>
            <textarea value={info.description} onChange={e => setInfo({ ...info, description: e.target.value })} rows={3} className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring focus:outline-none resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-sm font-medium mb-1.5 block">Min buyurtma</label><Input type="number" value={info.min_order_amount} onChange={e => setInfo({ ...info, min_order_amount: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Yetkazish narxi</label><Input type="number" value={info.delivery_fee} onChange={e => setInfo({ ...info, delivery_fee: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Tayyorlash (daq)</label><Input type="number" value={info.avg_prep_time} onChange={e => setInfo({ ...info, avg_prep_time: e.target.value })} /></div>
          </div>
          <Button onClick={saveInfo} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</Button>
        </CardContent></Card>
      )}

      {tab === 'media' && (
        <Card><CardContent className="pt-5 space-y-6 max-w-lg">
          <div className="space-y-3">
            <h3 className="font-medium">Logo</h3>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
                {restaurant.logo ? <img src={restaurant.logo} alt="" className="h-full w-full object-cover" /> : <Camera className="h-8 w-8 text-muted-foreground" />}
              </div>
              <label className="cursor-pointer inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted transition-colors">
                <Upload className="h-4 w-4" /> {uploading === 'logo' ? 'Yuklanmoqda...' : 'Logo yuklash'}
                <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'logo')} />
              </label>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="font-medium">Muqova rasmi</h3>
            <div className="h-36 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
              {restaurant.cover_image ? <img src={restaurant.cover_image} alt="" className="h-full w-full object-cover" /> : <Camera className="h-10 w-10 text-muted-foreground" />}
            </div>
            <label className="cursor-pointer inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted transition-colors">
              <Upload className="h-4 w-4" /> {uploading === 'cover_image' ? 'Yuklanmoqda...' : 'Muqova yuklash'}
              <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'cover_image')} />
            </label>
          </div>
        </CardContent></Card>
      )}

      {tab === 'hours' && (
        <Card><CardContent className="pt-5 space-y-4 max-w-lg">
          <p className="text-sm text-muted-foreground">Har kun uchun ish vaqtini belgilang</p>
          <div className="space-y-3">
            {hours.map((h, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-24 text-sm font-medium">{DAYS[i]}</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={!h.is_closed} onChange={e => setHours(prev => prev.map((x, j) => j === i ? { ...x, is_closed: !e.target.checked } : x))} className="h-4 w-4 rounded" />
                  <span className="text-xs text-muted-foreground">{h.is_closed ? 'Dam olish' : 'Ochiq'}</span>
                </label>
                {!h.is_closed && (<>
                  <Input type="time" value={h.open_time} onChange={e => setHours(prev => prev.map((x, j) => j === i ? { ...x, open_time: e.target.value } : x))} className="h-8 w-28 text-sm" />
                  <span className="text-muted-foreground">—</span>
                  <Input type="time" value={h.close_time} onChange={e => setHours(prev => prev.map((x, j) => j === i ? { ...x, close_time: e.target.value } : x))} className="h-8 w-28 text-sm" />
                </>)}
              </div>
            ))}
          </div>
          <Button onClick={saveHours} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</Button>
        </CardContent></Card>
      )}
    </div>
  )
}
