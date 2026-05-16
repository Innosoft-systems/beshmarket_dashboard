'use client';

import { useActionState } from 'react';
import { AlertCircle, Loader2, Phone, ShieldCheck } from 'lucide-react';
import { restaurantLoginAction, type RestaurantLoginFormState } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState: RestaurantLoginFormState = {};

export function RestaurantLoginForm() {
  const [state, formAction, isPending] = useActionState(restaurantLoginAction, initialState);

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

      <div className="space-y-2">
        <Label htmlFor="phone">Telefon raqam</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+998901234567"
            defaultValue={state.phone ?? ''}
            key={state.phone ?? ''}
            disabled={isPending}
            className="h-11 pl-10"
          />
        </div>
      </div>

      {state.sent && (
        <div className="space-y-2">
          <Label htmlFor="code">OTP kod</Label>
          <div className="relative">
            <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              disabled={isPending}
              className="h-11 pl-10"
              autoFocus
            />
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
            'OTP yuborish'
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
