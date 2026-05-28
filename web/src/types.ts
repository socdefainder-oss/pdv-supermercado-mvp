export type Role = 'ADMIN' | 'CASHIER';
export type Unit = 'UN' | 'KG' | 'CX' | 'LT' | 'ML' | 'PCT';
export type PaymentMethod = 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'PIX';
export type DiscountType = 'NONE' | 'FIXED' | 'PERCENTAGE';

export type User = { id: string; name: string; email: string; role: Role; discountLimitCents: number; active?: boolean };
export type Category = { id: string; name: string; active: boolean };
export type Product = { id: string; name: string; barcode: string; categoryId: string; category?: Category; unit: Unit; costPriceCents: number; salePriceCents: number; stockQuantity: string | number; minStock: string | number; active: boolean };
export type CashRegister = { id: string; operatorId: string; openingAmountCents: number; closingAmountCents?: number; expectedCashCents?: number; differenceCents?: number; status: 'OPEN' | 'CLOSED'; openedAt: string; closedAt?: string; operator?: { id: string; name: string } };
export type Sale = { id: string; grossTotalCents: number; discountTotalCents: number; netTotalCents: number; status: string; createdAt: string; operator?: { name: string }; payments: { method: PaymentMethod; amountCents: number; changeCents: number }[]; items?: { product: Product; quantity: string | number; unitPriceCents: number; subtotalCents: number }[] };
export type CartItem = { product: Product; quantity: number };
