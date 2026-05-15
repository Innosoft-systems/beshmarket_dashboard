export interface Restaurant {
  _id: string;
  name: string;
  slug?: string;
  category_id?: string;
  owner_id?: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  description?: string;
  lat?: number;
  lng?: number;
  cuisine_tags?: string[];
  eco_score?: number;
  avg_prep_time?: number;
  min_order_amount?: number;
  delivery_fee?: number;
  commission_rate?: number;
  logo?: string;
  cover_image?: string;
  is_active: boolean;
  is_open: boolean;
  is_verified?: boolean;
  status?: string;
  avg_rating: number;
}

export interface GetRestaurantsParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}
