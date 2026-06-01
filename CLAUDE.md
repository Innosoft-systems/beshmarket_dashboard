# Dashboard — Next.js 16 Admin Panel

## Komandalar

```bash
npm run dev      # localhost:3000
npm run build
npm run lint
```

## Struktura

```
app/
  (auth)/         # login sahifasi, auth yo'q guard
  (dashboard)/    # asosiy admin layout
  (restaurant)/   # restoran panel
  api/            # route handlers (proxy to backend)
components/
  ui/             # shadcn komponentlari — bu yerdan reuse
hooks/            # custom React hooks
lib/              # utils, cn(), firebase init
schemas/          # zod validation sxemalari
types/            # TypeScript interface/type
middleware.ts     # Next.js middleware (auth redirect)
```

## Yangi komponent/sahifa qo'shish

```bash
# shadcn komponent qo'shish
npx shadcn@latest add <component-name>
# komponentlar components/ui/ ga tushadi
```

Server Component default. `"use client"` faqat: state, event handler, browser API kerak bo'lsa.

Har yangi route:
- `page.tsx` — asosiy sahifa
- `loading.tsx` — Suspense fallback
- `error.tsx` — Error boundary

## API klient

Backend ga so'rovlar: `app/api/` route handlers orqali (CORS va token server-side).
Direct fetch: `fetch('/api/...')` yoki custom hook `hooks/` da.

## Auth

Firebase web SDK. `lib/` da init. `middleware.ts` token validatsiya qiladi.
Backend JWT token Firebase token bilan exchange qilinadi.

## Yandex Maps

`@pbe/react-yandex-maps` paketi. `"use client"` komponent bo'lishi shart.

## Socket.io

```ts
import { io } from 'socket.io-client'
// Backend ws: process.env.NEXT_PUBLIC_SOCKET_URL
```

## Env variables

```
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
NEXT_PUBLIC_FIREBASE_*
```

## Kod uslubi

- TypeScript strict
- Tailwind 4 + shadcn/ui + `cn()` from `lib/utils`
- Zod schema → `schemas/` da, form validation `react-hook-form` + `@hookform/resolvers/zod`
- TanStack Table `@tanstack/react-table` jadvallar uchun
- Recharts grafik uchun
- Sonner toast uchun (`sonner` paketi)
