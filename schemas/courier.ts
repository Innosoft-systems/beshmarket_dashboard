import { z } from "zod";

export const courierFormSchema = z.object({
  full_name: z.string().min(2, "Ism kiritish shart"),
  phone: z.string().min(9, "Telefon kiritish shart"),
  vehicle_type: z.string().min(1, "Transport turini tanlang"),
  vehicle_number: z.string().optional(),
  city: z.string().min(2, "Shahar kiritish shart"),
});

export type CourierFormValues = z.infer<typeof courierFormSchema>;

export const courierDocumentsFormSchema = z.object({
  birth_date: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  address: z.string().optional(),
  passport_series: z.string().optional(),
  passport_number: z.string().optional(),
  passport_issued_date: z.string().optional(),
  passport_expiry_date: z.string().optional(),
  driver_license_number: z.string().optional(),
  driver_license_expiry: z.string().optional(),
}).refine(
  (d) => {
    const hasSeries = !!d.passport_series?.trim();
    const hasNumber = !!d.passport_number?.trim();
    return hasSeries === hasNumber;
  },
  { message: "Passport seriya va raqam birga kiritilishi kerak", path: ["passport_number"] }
);

export type CourierDocumentsFormValues = z.infer<typeof courierDocumentsFormSchema>;
