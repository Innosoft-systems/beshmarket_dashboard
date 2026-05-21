'use client';

import { useState, useActionState } from 'react';
import { AlertCircle, Loader2, Phone } from 'lucide-react';
import { restaurantLoginAction, type RestaurantLoginFormState } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  const d = digits.startsWith('998') ? digits.slice(3) : digits;
  let result = '+998';
  if (d.length > 0) result += ' ' + d.slice(0, 2);
  if (d.length > 2) result += ' ' + d.slice(2, 5);
  if (d.length > 5) result += ' ' + d.slice(5, 7);
  if (d.length > 7) result += ' ' + d.slice(7, 9);
  return result;
}

const initialState: RestaurantLoginFormState = {};

export function RestaurantLoginForm() {
  const [state, formAction, isPending] = useActionState(restaurantLoginAction, initialState);
  const [phone, setPhone] = useState(() => formatPhone(state.phone ?? ''));
  const [otp, setOtp] = useState('');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length <= 12) setPhone(formatPhone(raw));
  };

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {!state.sent ? (
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon raqam</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+998 90 123 45 67"
              value={phone}
              onChange={handlePhoneChange}
              disabled={isPending}
              className="h-11 pl-10"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">{phone} raqamingizga yuborilgan tasdiqlash kodini kiriting</p>
          <input type="hidden" name="phone" value={phone} />
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp} name="code" autoFocus>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>
      )}

      <div className="grid gap-2">
        <Button type="submit" name="intent" value={state.sent ? 'verify' : 'send'} disabled={isPending} className="h-11">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Tekshirilmoqda...
            </>
          ) : state.sent ? (
            'Kirish'
          ) : (
            'Tasdiqlash kodini yuborish'
          )}
        </Button>
        {state.sent && (
          <Button type="submit" name="intent" value="send" variant="outline" disabled={isPending}>
            Kodni qayta yuborish
          </Button>
        )}
      </div>
    </form>
  );
}
