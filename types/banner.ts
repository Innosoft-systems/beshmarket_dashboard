export interface Banner {
  _id: string;
  title_uz: string;
  title_ru: string;
  title_en: string;
  subtitle_uz?: string;
  subtitle_ru?: string;
  subtitle_en?: string;
  image: string;
  link?: string;
  sort_order: number;
  is_active: boolean;
  createdAt: string;
}
