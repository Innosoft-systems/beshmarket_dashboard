import { z } from "zod";

export const restaurantFormSchema = z.object({
  name: z.string().min(2, "Nom kiritish shart"),
  phone: z.string().min(9, "Telefon kiritish shart"),
  address: z.string().min(3, "Manzil kiritish shart"),
  city: z.string().min(2, "Shahar kiritish shart"),
  district: z.string().min(2, "Tuman kiritish shart"),
  logo: z.string().optional(),
  // Ilova ro'yxati foydalanuvchi joylashuvi ma'lum bo'lganda lat/lng bo'yicha
  // filtrlaydi — koordinatasiz restoran ro'yxatga umuman tushmaydi. Sxemada
  // ixtiyoriy: eski, koordinatasi yo'q restoranlarni tahrirlash bloklanmasin.
  // Yangi restoran uchun majburiyligini forma o'zi tekshiradi.
  lat: z.union([z.nan(), z.number().min(-90).max(90)]).optional(),
  lng: z.union([z.nan(), z.number().min(-180).max(180)]).optional(),
  owner_phone: z.string().regex(/^\+998\d{9}$/, "Telefon +998XXXXXXXXX formatida bo'lishi kerak"),
  owner_username: z.string()
    .trim()
    .regex(/^[a-z0-9._-]{3,40}$/, "3–40 ta kichik lotin harfi, raqam, nuqta, _ yoki - ishlating"),
  owner_password: z.union([
    z.literal(""),
    z.string().min(12, "Parol kamida 12 ta belgidan iborat bo'lishi kerak").max(128),
  ]),
  type: z.enum(["restaurant", "market"]).optional(),
  order: z.number().int().min(0).optional(),
  commission_rate: z.number().min(0, "Komissiya 0% dan kam bo'lmaydi").max(100, "Komissiya 100% dan oshmaydi"),
  // Ilova kartochkadagi taxminiy vaqtni shu qiymat + mijozgacha bo'lgan yo'l
  // vaqtidan yasaydi, shuning uchun chegarasi bor.
  avg_prep_time: z.number().int().min(1, "Kamida 1 daqiqa").max(240, "240 daqiqadan oshmasin"),
});

export type RestaurantFormValues = z.infer<typeof restaurantFormSchema>;
