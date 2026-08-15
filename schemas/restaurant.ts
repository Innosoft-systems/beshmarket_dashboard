import { z } from "zod";

export const restaurantFormSchema = z.object({
  name: z.string().min(2, "Nom kiritish shart"),
  phone: z.string().min(9, "Telefon kiritish shart"),
  address: z.string().min(3, "Manzil kiritish shart"),
  city: z.string().min(2, "Shahar kiritish shart"),
  district: z.string().min(2, "Tuman kiritish shart"),
  logo: z.string().optional(),
  owner_phone: z.string().min(9, "Egasi telefoni kiritish shart").optional().or(z.literal("")),
  type: z.enum(["restaurant", "market"]).optional(),
  order: z.number().int().min(0).optional(),
  commission_rate: z.number().min(0, "Komissiya 0% dan kam bo'lmaydi").max(100, "Komissiya 100% dan oshmaydi"),
});

export type RestaurantFormValues = z.infer<typeof restaurantFormSchema>;
