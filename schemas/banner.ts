import { z } from "zod";

export const bannerFormSchema = z.object({
  title_uz: z.string().min(2, "Sarlavha (UZ) kiritish shart"),
  title_ru: z.string().min(2, "Sarlavha (RU) kiritish shart"),
  title_en: z.string().min(2, "Sarlavha (EN) kiritish shart"),
  subtitle_uz: z.string().optional(),
  subtitle_ru: z.string().optional(),
  subtitle_en: z.string().optional(),
  image: z.string().min(1, "Rasm yuklash shart"),
  link: z.string().optional(),
  sort_order: z.preprocess((v) => (v === "" || v === undefined ? 0 : Number(v)), z.number()),
  is_active: z.boolean().optional(),
});

export type BannerFormValues = z.infer<typeof bannerFormSchema>;
