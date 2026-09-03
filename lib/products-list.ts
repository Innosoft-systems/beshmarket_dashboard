/**
 * Menyu ro'yxatining umumiy shakllari.
 *
 * Server action fayli faqat async funksiya eksport qila oladi, shuning uchun
 * sahifa o'lchami va tiplar shu yerda turadi — server komponenti ham, mijoz
 * komponenti ham bir xil qiymatdan foydalanadi.
 */

/** Bir sahifada nechta mahsulot. Birinchi sahifani server render qiladi. */
export const PRODUCTS_PAGE_SIZE = 30

export interface ProductCategoryCounts {
  total: number
  uncategorized: number
  by_category: Record<string, number>
}

export interface ProductsPage {
  // Mahsulot hujjati keng va bu jadval uni xom holda ko'rsatadi; qolgan
  // fayllardagi kabi bo'sh qoldirilgan.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  pagination: { page: number; totalPages: number; total: number }
}

export interface ProductQuery {
  page?: number
  search?: string
  menuCategoryId?: string
}
