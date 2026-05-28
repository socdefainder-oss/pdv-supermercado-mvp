import { Router } from 'express';
import { PaymentMethod, UserRole } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getCashSummary } from '../services/cashSummary.js';

export const reportsRouter = Router();
reportsRouter.use(requireRoles(UserRole.ADMIN));

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

reportsRouter.get('/sales-today', asyncHandler(async (_req, res) => {
  const { start, end } = todayRange();
  const sales = await prisma.sale.findMany({ where: { createdAt: { gte: start, lt: end } }, include: { operator: { select: { name: true } }, payments: true }, orderBy: { createdAt: 'desc' } });
  res.json(sales);
}));

reportsRouter.get('/sales-period', asyncHandler(async (req, res) => {
  const from = typeof req.query.from === 'string' ? new Date(req.query.from) : undefined;
  const to = typeof req.query.to === 'string' ? new Date(req.query.to) : undefined;
  const operatorId = typeof req.query.operatorId === 'string' ? req.query.operatorId : undefined;
  const method = typeof req.query.method === 'string' && req.query.method in PaymentMethod ? req.query.method as PaymentMethod : undefined;
  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: from, lte: to }, operatorId, payments: method ? { some: { method } } : undefined },
    include: { operator: { select: { name: true } }, payments: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(sales);
}));

reportsRouter.get('/top-products', asyncHandler(async (_req, res) => {
  const grouped = await prisma.saleItem.groupBy({ by: ['productId'], _sum: { quantity: true, subtotalCents: true }, orderBy: { _sum: { subtotalCents: 'desc' } }, take: 20 });
  const products = await prisma.product.findMany({ where: { id: { in: grouped.map((item: any) => item.productId) } } });
  res.json(grouped.map((item: any) => ({ product: products.find((product: any) => product.id === item.productId), quantity: item._sum.quantity, totalCents: item._sum.subtotalCents ?? 0 })));
}));

reportsRouter.get('/low-stock', asyncHandler(async (_req, res) => {
  const products = await prisma.product.findMany({ include: { category: true }, orderBy: { name: 'asc' } });
  res.json(products.filter((product: any) => Number(product.stockQuantity) <= Number(product.minStock)));
}));

reportsRouter.get('/cash-register/:id', validate(z.object({ params: z.object({ id: z.string() }) })), asyncHandler(async (req, res) => {
  res.json(await getCashSummary(prisma, String(req.params.id)));
}));

reportsRouter.get('/margin', asyncHandler(async (req, res) => {
  const from = typeof req.query.from === 'string' ? new Date(req.query.from) : undefined;
  const to = typeof req.query.to === 'string' ? new Date(req.query.to) : undefined;
  const sales = await prisma.sale.findMany({ where: { status: 'COMPLETED', createdAt: { gte: from, lte: to } }, include: { items: { include: { product: true } } } });
  const rows = new Map<string, any>();
  for (const sale of sales as any[]) {
    for (const item of sale.items) {
      const current = rows.get(item.productId) ?? { product: item.product, quantity: 0, revenueCents: 0, costCents: 0, marginCents: 0 };
      current.quantity += Number(item.quantity);
      current.revenueCents += item.subtotalCents;
      current.costCents += Math.round(Number(item.quantity) * item.product.costPriceCents);
      current.marginCents = current.revenueCents - current.costCents;
      rows.set(item.productId, current);
    }
  }
  res.json([...rows.values()].sort((a, b) => b.marginCents - a.marginCents));
}));

reportsRouter.get('/no-movement-products', asyncHandler(async (req, res) => {
  const days = Number(req.query.days ?? 30);
  const since = new Date();
  since.setDate(since.getDate() - days);
  const [products, sales] = await Promise.all([
    prisma.product.findMany({ include: { category: true } }),
    prisma.sale.findMany({ where: { status: 'COMPLETED', createdAt: { gte: since } }, include: { items: true } }),
  ]);
  const sold = new Set((sales as any[]).flatMap((sale) => sale.items.map((item: any) => item.productId)));
  res.json((products as any[]).filter((product) => !sold.has(product.id)));
}));
