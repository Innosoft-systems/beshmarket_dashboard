import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFullImgUrl(path?: string | null): string {
  if (!path) return ""
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`
}
