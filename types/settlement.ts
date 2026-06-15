export type SettlementStatus = 'pending' | 'paid';

export interface Settlement {
  _id: string;
  restaurant_id: { _id: string; name: string; commission_rate: number } | string;
  period_start: string;
  period_end: string;
  orders_count: number;
  total_orders_amount: number;
  commission_amount: number;
  payout_amount: number;
  status: SettlementStatus;
  paid_at?: string;
  payment_note?: string;
  created_by: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementPreview {
  restaurant_id: string;
  period_start: string;
  period_end: string;
  orders_count: number;
  total_orders_amount: number;
  commission_amount: number;
  payout_amount: number;
}
