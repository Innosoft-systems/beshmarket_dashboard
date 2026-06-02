import type { Metadata } from "next";
import "./globals.css";
import { validateEnv } from "@/lib/env";

validateEnv();

export const metadata: Metadata = {
  title: "BeshMarket Dashboard",
  description: "BeshMarket boshqaruv paneli",
};

import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
