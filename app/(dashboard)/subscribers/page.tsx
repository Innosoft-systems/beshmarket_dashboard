import type { Metadata } from "next"
import { SubscribersClient } from "@/components/subscribers/SubscribersClient"

export const metadata: Metadata = { title: "Obunachilar | BeshMarket" }

export default function SubscribersPage() {
  return <SubscribersClient />
}
