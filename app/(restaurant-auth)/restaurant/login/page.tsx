'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { sendOtpAction, verifyOtpAction } from '@/lib/actions/restaurant-auth'
import { ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function RestaurantLoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!phone.trim()) return
    setLoading(true)
    const r = await sendOtpAction(phone.trim())
    setLoading(false)
    if (r.success) { setStep('otp'); toast.success('Kod yuborildi') }
    else toast.error(r.error)
  }

  const handleVerify = async () => {
    if (!code.trim()) return
    setLoading(true)
    const r = await verifyOtpAction(phone.trim(), code.trim())
    setLoading(false)
    if (r.success) { toast.success('Xush kelibsiz!'); router.push('/restaurant') }
    else toast.error(r.error)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/30 to-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-xl shadow-black/5">
        <div className="border-b border-border/60 px-8 py-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
            <ShoppingBag className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">BeshMarket</h1>
          <p className="mt-1 text-sm text-muted-foreground">Restoran paneli</p>
        </div>

        <div className="px-8 py-7 space-y-4">
          {step === 'phone' ? (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Telefon raqam</label>
                <Input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+998901234567"
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
              </div>
              <Button className="w-full" onClick={handleSend} disabled={loading || !phone.trim()}>
                {loading ? 'Yuborilmoqda...' : 'Kod olish'}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{phone} raqamiga SMS kod yuborildi</p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">SMS kod</label>
                <Input
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  onKeyDown={e => e.key === 'Enter' && handleVerify()}
                />
              </div>
              <Button className="w-full" onClick={handleVerify} disabled={loading || !code.trim()}>
                {loading ? 'Tekshirilmoqda...' : 'Kirish'}
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
