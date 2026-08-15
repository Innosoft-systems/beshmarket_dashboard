'use client';

import { useActionState, useState } from 'react';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';
import { restaurantLoginAction, type RestaurantLoginFormState } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState: RestaurantLoginFormState = {};

export function RestaurantLoginForm() {
  const [state, formAction, isPending] = useActionState(restaurantLoginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

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
        <Label htmlFor="restaurant-username">Foydalanuvchi nomi</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="restaurant-username"
            name="username"
            type="text"
            placeholder="restoran_username"
            autoComplete="username"
            autoFocus
            disabled={isPending}
            className="h-11 pl-10 transition-shadow focus-visible:ring-primary/50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="restaurant-password">Parol</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="restaurant-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••••••"
            autoComplete="current-password"
            disabled={isPending}
            className="h-11 pl-10 pr-10 transition-shadow focus-visible:ring-primary/50"
          />
          <button
            type="button"
            onClick={() => setShowPassword(value => !value)}
            disabled={isPending}
            aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko\'rsatish'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="h-11 w-full font-semibold">
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Kirish...
          </>
        ) : (
          'Tizimga kirish'
        )}
      </Button>
    </form>
  );
}
