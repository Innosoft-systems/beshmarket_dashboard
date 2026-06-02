export type PaymentMethod = 'cash' | 'payme' | 'click';
export type PaymentStatus = 'pending' | 'waiting' | 'paid' | 'failed' | 'cancelled' | 'refunded';

export interface Payment {
  _id: string;
  order_id: { _id: string; order_number: string; total: number; payment_method: string } | string;
  user_id: { _id: string; full_name: string; phone: string } | string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: string;
  transaction_id?: string;
  paid_at?: string;
  refund_amount?: number;
  refunded_at?: string;
  cancel_reason?: string;
  createdAt: string;
  updatedAt: string;
}
