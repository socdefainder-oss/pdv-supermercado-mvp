import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { audit } from '../lib/audit.js';
import { requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

export const commercialRouter = Router();
commercialRouter.use(requireRoles(UserRole.ADMIN));

commercialRouter.get('/promotions', asyncHandler(async (_req, res) => {
  res.json(await prisma.promotion.findMany({ include: { product: true }, orderBy: { startsAt: 'desc' } }));
}));

commercialRouter.post('/promotions', validate(z.object({ body: z.object({ productId: z.string(), description: z.string().min(3), discountPercent: z.coerce.number().min(0).max(100).optional(), discountCents: z.number().int().min(0).optional(), startsAt: z.string(), endsAt: z.string(), active: z.boolean().default(true) }) })), asyncHandler(async (req, res) => {
  const promotion = await prisma.promotion.create({ data: { ...req.body, startsAt: new Date(req.body.startsAt), endsAt: new Date(req.body.endsAt) } });
  await audit(req.user?.id, 'PROMOTION_CREATE', 'Promotion', promotion.id, req.body);
  res.status(201).json(promotion);
}));

commercialRouter.get('/price-tables', asyncHandler(async (_req, res) => {
  res.json(await prisma.priceTable.findMany({ include: { items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } }));
}));

commercialRouter.post('/price-tables', validate(z.object({ body: z.object({ name: z.string().min(2), items: z.array(z.object({ productId: z.string(), salePriceCents: z.number().int().positive() })).min(1) }) })), asyncHandler(async (req, res) => {
  const table = await prisma.priceTable.create({ data: { name: req.body.name, items: { create: req.body.items } }, include: { items: true } });
  await audit(req.user?.id, 'PRICE_TABLE_CREATE', 'PriceTable', table.id, req.body);
  res.status(201).json(table);
}));

commercialRouter.get('/credits', asyncHandler(async (_req, res) => {
  res.json(await prisma.customerCredit.findMany({ include: { customer: true, sale: true }, orderBy: { createdAt: 'desc' } }));
}));

commercialRouter.post('/credits', validate(z.object({ body: z.object({ customerId: z.string(), amountCents: z.number().int().positive(), dueDate: z.string().optional() }) })), asyncHandler(async (req, res) => {
  const credit = await prisma.customerCredit.create({ data: { customerId: req.body.customerId, amountCents: req.body.amountCents, dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined } });
  await audit(req.user?.id, 'CUSTOMER_CREDIT_CREATE', 'CustomerCredit', credit.id, req.body);
  res.status(201).json(credit);
}));
