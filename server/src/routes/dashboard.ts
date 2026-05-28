import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { asyncHandler } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { requireRoles } from '../middleware/auth.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireRoles(UserRole.ADMIN));

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

dashboardRouter.get('/', asyncHandler(async (_req, res) => {
  const { start, end } = todayRange();
  const [sales, lowStock, openCashRegisters, topProducts] = await Promise.all([
    prisma.sale.findMany({ where: { status: 'COMPLETED', createdAt: { gte: start, lt: end } }, include: { payments: true } }),
    prisma.product.findMany({ include: { category: true } }),
    prisma.cashRegister.findMany({ where: { status: 'OPEN' }, include: { operator: { select: { name: true } } } }),
    prisma.saleItem.groupBy({ by: ['productId'], _sum: { quantity: true, subtotalCents: true }, orderBy: { _sum: { subtotalCents: 'desc' } }, take: 5 }),
  ]);

  const revenueCents = sales.reduce((sum: number, sale: any) => sum + sale.netTotalCents, 0);
  const ticketAverageCents = sales.length ? Math.round(revenueCents / sales.length) : 0;
  const paymentTotals = { CASH: 0, DEBIT_CARD: 0, CREDIT_CARD: 0, PIX: 0 };
  for (const sale of sales as any[]) for (const payment of sale.payments) paymentTotals[payment.method as keyof typeof paymentTotals] += payment.amountCents;
  const products = await prisma.product.findMany({ where: { id: { in: topProducts.map((item: any) => item.productId) } } });

  res.json({
    salesCount: sales.length,
    revenueCents,
    ticketAverageCents,
    paymentTotals,
    openCashRegisters,
    lowStock: lowStock.filter((product: any) => Number(product.stockQuantity) <= Number(product.minStock)).slice(0, 10),
    topProducts: topProducts.map((item: any) => ({ product: products.find((product: any) => product.id === item.productId), quantity: item._sum.quantity, totalCents: item._sum.subtotalCents ?? 0 })),
  });
}));
