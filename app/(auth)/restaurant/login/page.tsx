import type { Metadata } from 'next';
import { Store } from 'lucide-react';
import { RestaurantLoginForm } from '@/components/auth/RestaurantLoginForm';

export const metadata: Metadata = {
  title: 'Restoran kirishi — BeshMarket',
  description: 'BeshMarket restoran paneliga kirish',
};

export default function RestaurantLoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-border/60 bg-card shadow-xl shadow-black/5">
          <div className="border-b border-border/60 px-8 py-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
              <Store className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Restoran paneli</h1>
            <p className="mt-1 text-sm text-muted-foreground">Telefon raqam orqali kirish</p>
          </div>
          <div className="px-8 py-7">
            <RestaurantLoginForm />
          </div>
          <div className="border-t border-border/60 px-8 py-4">
            <p className="text-center text-xs text-muted-foreground">
              © {new Date().getFullYear()} BeshMarket
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
