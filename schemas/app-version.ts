import { z } from "zod"

export const appVersionSchema = z.object({
  latestVersion: z
    .string()
    .min(1, "Versiya kiritilishi shart")
    .regex(/^\d+\.\d+\.\d+$/, "Format: 1.0.0"),
  minVersion: z
    .string()
    .min(1, "Minimal versiya kiritilishi shart")
    .regex(/^\d+\.\d+\.\d+$/, "Format: 1.0.0"),
  storeUrl: z
    .string()
    .min(1, "Do'kon havolasi kiritilishi shart")
    .url("To'g'ri URL kiriting"),
  changelog: z.object({
    uz: z.string().default(""),
    ru: z.string().default(""),
    en: z.string().default(""),
  }),
  isActive: z.boolean().default(true),
})

export type AppVersionFormValues = z.infer<typeof appVersionSchema>
