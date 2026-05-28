import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { AppError, asyncHandler } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { audit } from '../lib/audit.js';
import { requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

export const purchasesRouter = Router();
purchasesRouter.use(requireRoles(UserRole.ADMIN));

const purchaseSchema = z.object({ body: z.object({ supplierId: z.string(), notes: z.string().optional(), items: z.array(z.object({ productId: z.string(), quantity: z.coerce.number().positive(), costPriceCents: z.number().int().min(0) })).min(1) }) });

purchasesRouter.get('/', asyncHandler(async (_req, res) => {
  res.json(await prisma.purchaseOrder.findMany({ include: { supplier: true, items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } }));
}));

purchasesRouter.post('/', validate(purchaseSchema), asyncHandler(async (req, res) => {
  const totalCents = req.body.items.reduce((sum: number, item: any) => sum + Math.round(item.quantity * item.costPriceCents), 0);
  const order = await prisma.purchaseOrder.create({ data: { supplierId: req.body.supplierId, notes: req.body.notes, totalCents, items: { create: req.body.items.map((item: any) => ({ productId: item.productId, quantity: item.quantity, costPriceCents: item.costPriceCents, subtotalCents: Math.round(item.quantity * item.costPriceCents) })) } }, include: { items: true } });
  await audit(req.user?.id, 'PURCHASE_CREATE', 'PurchaseOrder', order.id, req.body);
  res.status(201).json(order);
}));

purchasesRouter.post('/:id/receive', validate(z.object({ params: z.object({ id: z.string() }) })), asyncHandler(async (req, res) => {
  const order = await prisma.$transaction(async (tx: any) => {
    const purchase = await tx.purchaseOrder.findUnique({ where: { id: String(req.params.id) }, include: { items: true } });
    if (!purchase) throw new AppError(404, 'Pedido de compra nao encontrado.');
    if (purchase.status !== 'OPEN') throw new AppError(409, 'Pedido nao esta aberto.');
    for (const item of purchase.items) {
      await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { increment: Number(item.quantity) }, costPriceCents: item.costPriceCents } });
      await tx.stockMovement.create({ data: { productId: item.productId, type: 'IN', quantity: item.quantity, reason: 'Entrada por compra', userId: req.user!.id } });
    }
    return tx.purchaseOrder.update({ where: { id: purchase.id }, data: { status: 'RECEIVED', receivedAt: new Date() } });
  });
  await audit(req.user?.id, 'PURCHASE_RECEIVE', 'PurchaseOrder', order.id);
  res.json(order);
}));
