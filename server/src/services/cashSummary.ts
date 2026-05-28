import { PaymentMethod } from '@prisma/client';

type Db = any;

export async function getCashSummary(db: Db, cashRegisterId: string) {
  const cashRegister = await db.cashRegister.findUnique({
    where: { id: cashRegisterId },
    include: { operator: { select: { id: true, name: true, email: true } } },
  });
  if (!cashRegister) return null;

  const sales = await db.sale.findMany({
    where: { cashRegisterId, status: 'COMPLETED' },
    include: { payments: true },
  });
  const movements = await db.cashMovement.findMany({ where: { cashRegisterId } });

  const paymentTotals = { CASH: 0, DEBIT_CARD: 0, CREDIT_CARD: 0, PIX: 0 } satisfies Record<PaymentMethod, number>;
  let changeCents = 0;
  for (const sale of sales) {
    for (const payment of sale.payments) {
      paymentTotals[payment.method as PaymentMethod] += payment.amountCents;
      if (payment.method === 'CASH') changeCents += payment.changeCents;
    }
  }

  const supplyCents = movements.filter((m: any) => m.type === 'SUPPLY').reduce((sum: number, m: any) => sum + m.amountCents, 0);
  const withdrawCents = movements.filter((m: any) => m.type === 'WITHDRAW').reduce((sum: number, m: any) => sum + m.amountCents, 0);
  const soldCents = sales.reduce((sum: number, sale: any) => sum + sale.netTotalCents, 0);
  const discountCents = sales.reduce((sum: number, sale: any) => sum + sale.discountTotalCents, 0);
  const expectedCashCents = cashRegister.openingAmountCents + paymentTotals.CASH - changeCents + supplyCents - withdrawCents;

  return { cashRegister, soldCents, discountCents, paymentTotals, supplyCents, withdrawCents, changeCents, expectedCashCents };
}
