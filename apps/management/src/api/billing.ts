import { apiClient } from './client';
import { BillData, DiscountType } from '@/types/cafe';

export interface InvoiceRecord {
  id: string;
  orderId?: string | null;
  diningSessionId?: string | null;
  billType?: string;
  invoiceNumber: string;
  tableNumber?: number;
  customerName?: string;
  subtotal: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  taxAmount: number;
  discountType?: DiscountType;
  discountPercentage?: number;
  discountAmount?: number;
  extraCharge?: number;
  amountAfterAdjustments?: number;
  roundOff?: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  settledAt?: string;
  createdAt: string;
  tableStatus?: string | null;
}

/** Discount and extra charge to apply while settling a bill. */
export interface SettleAdjustments {
  discountType: DiscountType;
  /** A % for PERCENT discounts, rupees for AMOUNT discounts. */
  discountValue: number;
  extraCharge?: number;
}

export const billingApi = {
  getLedger: async (): Promise<InvoiceRecord[]> => {
    return apiClient<InvoiceRecord[]>('/billing/ledger');
  },

  getPendingPayments: async (): Promise<InvoiceRecord[]> => {
    return apiClient<InvoiceRecord[]>('/billing/pending');
  },

  getBillReceipt: async (orderId: string): Promise<BillData> => {
    return apiClient<BillData>(`/billing/${orderId}`);
  },

  generateBill: async (orderId: string, discountPercentage?: number, extraCharge?: number): Promise<BillData> => {
    return apiClient<BillData>(`/billing/${orderId}/generate`, {
      method: 'POST',
      body: JSON.stringify({
        discount_percentage: discountPercentage ?? 0,
        discountPercentage: discountPercentage ?? 0,
        extra_charge: extraCharge ?? 0,
        extraCharge: extraCharge ?? 0,
      }),
    });
  },

  /** Takes payment and closes the order's dining session; with `adjustments`, the discount is applied in the same step. */
  settlePayment: async (orderId: string, paymentMethod: string, adjustments?: SettleAdjustments): Promise<InvoiceRecord> => {
    return apiClient<InvoiceRecord>(`/billing/${orderId}/settle`, {
      method: 'POST',
      body: JSON.stringify(
        adjustments
          ? {
              paymentMethod,
              discount_type: adjustments.discountType,
              discount_value: adjustments.discountValue,
              ...(adjustments.extraCharge !== undefined ? { extra_charge: adjustments.extraCharge } : {}),
            }
          : { paymentMethod }
      ),
    });
  },

  // Dining Session Billing APIs
  getSessionReceipt: async (sessionId: string): Promise<BillData> => {
    return apiClient<BillData>(`/billing/sessions/${sessionId}`);
  },

  generateSessionBill: async (sessionId: string, discountPercentage?: number, extraCharge?: number): Promise<BillData> => {
    return apiClient<BillData>(`/billing/sessions/${sessionId}/generate`, {
      method: 'POST',
      body: JSON.stringify({
        discount_percentage: discountPercentage ?? 0,
        discountPercentage: discountPercentage ?? 0,
        extra_charge: extraCharge ?? 0,
        extraCharge: extraCharge ?? 0,
      }),
    });
  },

  settleSessionPayment: async (sessionId: string, paymentMethod: string): Promise<InvoiceRecord> => {
    return apiClient<InvoiceRecord>(`/billing/sessions/${sessionId}/settle`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethod }),
    });
  },
};
