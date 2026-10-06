import { z } from 'zod';
import { calculatePricing, DiscountInput } from '../pricing';

export const OrderItemInputSchema = z.object({
  menuItemId: z.string().optional(),
  name: z.string().min(1, 'Item name is required'),
  category: z.string().optional(),
  price: z.number().nonnegative('Price cannot be negative'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  selectedOptions: z.record(z.string(), z.string()).optional(),
  selectedAddOns: z.array(z.string()).optional(),
  addOnsPrice: z.number().nonnegative().optional().default(0),
  specialInstructions: z.string().optional(),
});

export type OrderItemInput = z.infer<typeof OrderItemInputSchema>;

export const CreateOrderInputSchema = z.object({
  cafeId: z.string().default('van-vibes'),
  tableId: z.string().min(1, 'Table ID is required'),
  tableNumber: z.number().int().positive('Table number must be positive'),
  diningSessionId: z.string().optional(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerMobile: z.string().min(10, 'Valid 10-digit mobile number required').max(15),
  items: z.array(OrderItemInputSchema).min(1, 'Order must contain at least one item'),
  specialInstructions: z.string().optional(),
  source: z.enum(['QR', 'Staff', 'STAFF', 'CUSTOMER']).default('Staff'),
  createdBy: z.string().optional(),
  discount: z
    .object({
      type: z.enum(['FLAT', 'PERCENT']),
      value: z.number().nonnegative(),
      reason: z.string().min(1, 'Discount reason is required'),
    })
    .nullable()
    .optional(),
  taxRate: z.number().nonnegative().optional().default(0.05),
});

export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

export interface CalculatedOrder {
  id: string;
  cafeId: string;
  tableId: string;
  tableNumber: number;
  diningSessionId?: string;
  customerName: string;
  customerMobile: string;
  specialInstructions?: string;
  source: string;
  createdBy?: string;
  items: Array<OrderItemInput & { itemTotal: number }>;
  subtotal: number;
  discountType: 'FLAT' | 'PERCENT' | null;
  discountValue: number;
  discountAmount: number;
  discountReason: string | null;
  taxableAmount: number;
  taxRate: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  status: 'PLACED';
  paymentStatus: 'PENDING';
  createdAt: string;
}

/**
 * Authoritative Order Creator & Pricing Calculator
 * Enforces Zod validation, recalculates line totals and pricing server-side.
 */
export function buildOrder(input: unknown, orderIdGenerator?: () => string): CalculatedOrder {
  const validated = CreateOrderInputSchema.parse(input);

  const pricingItems = validated.items.map((item) => ({
    price: item.price,
    quantity: item.quantity,
    addOnsPrice: item.addOnsPrice || 0,
  }));

  const pricingResult = calculatePricing({
    items: pricingItems,
    discount: validated.discount as DiscountInput | null,
    taxRate: validated.taxRate,
  });

  const calculatedItems = validated.items.map((item) => {
    const unitPrice = item.price + (item.addOnsPrice || 0);
    const itemTotal = unitPrice * item.quantity;
    return {
      ...item,
      itemTotal,
    };
  });

  const orderId = orderIdGenerator ? orderIdGenerator() : `VV-${Date.now().toString().slice(-4)}`;

  return {
    id: orderId,
    cafeId: validated.cafeId,
    tableId: validated.tableId,
    tableNumber: validated.tableNumber,
    diningSessionId: validated.diningSessionId,
    customerName: validated.customerName,
    customerMobile: validated.customerMobile,
    specialInstructions: validated.specialInstructions,
    source: validated.source,
    createdBy: validated.createdBy || 'Staff',
    items: calculatedItems,
    subtotal: pricingResult.subtotal,
    discountType: pricingResult.discountType,
    discountValue: pricingResult.discountValue,
    discountAmount: pricingResult.discountAmount,
    discountReason: pricingResult.discountReason,
    taxableAmount: pricingResult.taxableAmount,
    taxRate: pricingResult.taxRate,
    cgstRate: pricingResult.cgstRate,
    cgstAmount: pricingResult.cgstAmount,
    sgstRate: pricingResult.sgstRate,
    sgstAmount: pricingResult.sgstAmount,
    totalTax: pricingResult.totalTax,
    roundOff: pricingResult.roundOff,
    grandTotal: pricingResult.grandTotal,
    status: 'PLACED',
    paymentStatus: 'PENDING',
    createdAt: new Date().toISOString(),
  };
}
