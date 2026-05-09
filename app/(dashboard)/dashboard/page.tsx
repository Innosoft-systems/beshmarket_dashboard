import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Asosiy sahifa — BeshMarket Dashboard',
};

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">BeshMarket Dashboard</h1>
        <p className="text-muted-foreground">Tizimga muvaffaqiyatli kirdingiz ✅</p>
      </div>
    </div>
  );
}
