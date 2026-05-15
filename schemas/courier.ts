import { z } from "zod";

export const courierFormSchema = z.object({
  full_name: z.string().min(2, "Ism kiritish shart"),
  phone: z.string().min(9, "Telefon kiritish shart"),
  vehicle_type: z.string().min(1, "Transport turini tanlang"),
  vehicle_number: z.string().optional(),
  city: z.string().min(2, "Shahar kiritish shart"),
});

export type CourierFormValues = z.infer<typeof courierFormSchema>;
