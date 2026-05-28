import { Router } from 'express';
import { StockMovementType, UserRole } from '@prisma/client';
import { z } from 'zod';
import { AppError, asyncHandler } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { audit } from '../lib/audit.js';
import { requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

export const stockRouter = Router();
stockRouter.use(requireRoles(UserRole.ADMIN));

const movementSchema = z.object({ body: z.object({ productId: z.string(), type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'LOSS']), quantity: z.coerce.number().positive(), reason: z.string().min(3), lot: z.string().optional(), expiresAt: z.string().optional() }) });

stockRouter.get('/movements', asyncHandler(async (req, res) => {
  const productId = typeof req.query.productId === 'string' ? req.query.productId : undefined;
  res.json(await prisma.stockMovement.findMany({ where: { productId }, include: { product: true, user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }));
}));

stockRouter.post('/movements', validate(movementSchema), asyncHandler(async (req, res) => {
  const movement = await prisma.$transaction(async (tx: any) => {
    const product = await tx.product.findUnique({ where: { id: req.body.productId } });
    if (!product) throw new AppError(404, 'Produto nao encontrado.');
    const quantity = Number(req.body.quantity);
    if (req.body.type === 'OUT' || req.body.type === 'LOSS') {
      if (Number(product.stockQuantity) < quantity) throw new AppError(409, 'Estoque insuficiente.');
      await tx.product.update({ where: { id: product.id }, data: { stockQuantity: { decrement: quantity } } });
    } else if (req.body.type === 'IN') {
      await tx.product.update({ where: { id: product.id }, data: { stockQuantity: { increment: quantity } } });
    } else {
      await tx.product.update({ where: { id: product.id }, data: { stockQuantity: quantity } });
    }
    const type = req.body.type as StockMovementType;
    return tx.stockMovement.create({ data: { productId: product.id, type, quantity, reason: req.body.reason, userId: req.user!.id, lot: req.body.lot, expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined } });
  });
  await audit(req.user?.id, 'STOCK_MOVEMENT', 'Product', req.body.productId, req.body);
  res.status(201).json(movement);
}));

stockRouter.get('/inventory', asyncHandler(async (_req, res) => {
  res.json(await prisma.inventory.findMany({ include: { items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } }));
}));

stockRouter.post('/inventory', validate(z.object({ body: z.object({ notes: z.string().optional(), items: z.array(z.object({ productId: z.string(), countedQuantity: z.coerce.number().min(0) })).min(1), applyAdjustments: z.boolean().default(true) }) })), asyncHandler(async (req, res) => {
  const inventory = await prisma.$transaction(async (tx: any) => {
    const ids = req.body.items.map((item: any) => item.productId);
    const products = await tx.product.findMany({ where: { id: { in: ids } } });
    const map = new Map(products.map((product: any) => [product.id, product]));
    const itemRows = [];
    for (const item of req.body.items) {
      const product: any = map.get(item.productId);
      if (!product) throw new AppError(404, 'Produto do inventario nao encontrado.');
      const systemQuantity = Number(product.stockQuantity);
      const difference = Number(item.countedQuantity) - systemQuantity;
      itemRows.push({ productId: product.id, countedQuantity: item.countedQuantity, systemQuantity, difference });
      if (req.body.applyAdjustments && difference !== 0) {
        await tx.product.update({ where: { id: product.id }, data: { stockQuantity: Number(item.countedQuantity) } });
        await tx.stockMovement.create({ data: { productId: product.id, type: 'ADJUSTMENT', quantity: Math.abs(difference), reason: `Inventario: ${req.body.notes ?? 'ajuste'}`, userId: req.user!.id } });
      }
    }
    return tx.inventory.create({ data: { userId: req.user!.id, status: 'CLOSED', notes: req.body.notes, closedAt: new Date(), items: { create: itemRows } }, include: { items: true } });
  });
  await audit(req.user?.id, 'INVENTORY_CLOSE', 'Inventory', inventory.id, req.body);
  res.status(201).json(inventory);
}));
