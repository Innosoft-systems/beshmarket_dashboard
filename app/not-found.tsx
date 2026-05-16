import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <p className="text-8xl font-bold text-muted-foreground/20">404</p>
        <h1 className="text-2xl font-semibold">Sahifa topilmadi</h1>
        <p className="text-muted-foreground">Siz qidirayotgan sahifa mavjud emas yoki o'chirilgan.</p>
        <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Bosh sahifaga qaytish
        </Link>
      </div>
    </div>
  )
}
