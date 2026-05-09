import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';
import { ShoppingBag } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Kirish — BeshMarket Dashboard',
  description: 'BeshMarket boshqaruv paneliga kirish',
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/30 to-background p-4">
      {/* Background pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/6 blur-3xl" />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-border/60 bg-card shadow-xl shadow-black/5 backdrop-blur-sm">
          {/* Header */}
          <div className="border-b border-border/60 px-8 py-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
              <ShoppingBag className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              BeshMarket
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Boshqaruv paneliga kirish
            </p>
          </div>

          {/* Form */}
          <div className="px-8 py-7">
            <LoginForm />
          </div>

          {/* Footer */}
          <div className="border-t border-border/60 px-8 py-4">
            <p className="text-center text-xs text-muted-foreground">
              © {new Date().getFullYear()} BeshMarket. Barcha huquqlar himoyalangan.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
