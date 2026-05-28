import { Router } from 'express';
import { DiscountType, PaymentMethod, UserRole } from '@prisma/client';
import { z } from 'zod';
import { AppError, asyncHandler } from '../lib/http.js';
import { calculateDiscount } from '../lib/money.js';
import { prisma } from '../lib/prisma.js';
import { audit } from '../lib/audit.js';
import { validate } from '../middleware/validate.js';

export const salesRouter = Router();

type SaleItemDraft = { product: { id: string; salePriceCents: number; name: string }; quantity: number; unitPriceCents: number; discountCents: number; subtotalCents: number };

const saleSchema = z.object({
  body: z.object({
    items: z.array(z.object({ productId: z.string(), quantity: z.coerce.number().positive(), discountCents: z.number().int().min(0).default(0) })).min(1),
    customerId: z.string().optional().nullable(),
    discountType: z.nativeEnum(DiscountType).default(DiscountType.NONE),
    discountValue: z.coerce.number().min(0).default(0),
    payments: z.array(z.object({ method: z.nativeEnum(PaymentMethod), amountCents: z.number().int().min(0) })).min(1),
  }),
});

salesRouter.post('/', validate(saleSchema), asyncHandler(async (req, res) => {
  const sale = await prisma.$transaction(async (tx: any) => {
    const cashRegister = await tx.cashRegister.findFirst({ where: { operatorId: req.user!.id, status: 'OPEN' } });
    if (!cashRegister) throw new AppError(409, 'Nao existe caixa aberto para este operador.');

    const ids = req.body.items.map((item: { productId: string }) => item.productId);
    const products = await tx.product.findMany({ where: { id: { in: ids } } });
    const productMap = new Map<string, any>(products.map((product: any) => [product.id, product]));

    let grossTotalCents = 0;
    const saleItems: SaleItemDraft[] = req.body.items.map((item: { productId: string; quantity: number; discountCents?: number }) => {
      const product = productMap.get(item.productId);
      if (!product) throw new AppError(404, 'Produto nao encontrado.');
      if (!product.active) throw new AppError(409, `${product.name} esta inativo.`);
      if (Number(product.stockQuantity) < item.quantity) throw new AppError(409, `Estoque insuficiente para ${product.name}.`);
      const lineGrossCents = Math.round(product.salePriceCents * item.quantity);
      const lineDiscountCents = Math.min(item.discountCents ?? 0, lineGrossCents);
      const subtotalCents = lineGrossCents - lineDiscountCents;
      grossTotalCents += subtotalCents;
      return { product, quantity: item.quantity, unitPriceCents: product.salePriceCents, discountCents: lineDiscountCents, subtotalCents };
    });

    const discountTotalCents = calculateDiscount(grossTotalCents, req.body.discountType, req.body.discountValue);
    if (req.user!.role !== UserRole.ADMIN && discountTotalCents > req.user!.discountLimitCents) throw new AppError(403, 'Desconto acima do limite do operador.');
    const netTotalCents = grossTotalCents - discountTotalCents;
    if (netTotalCents < 0) throw new AppError(400, 'Total da venda invalido.');

    const paidCents = req.body.payments.reduce((sum: number, payment: { amountCents: number }) => sum + payment.amountCents, 0);
    if (paidCents < netTotalCents) throw new AppError(409, 'Pagamento menor que o total da venda.');
    const hasCash = req.body.payments.some((payment: { method: PaymentMethod }) => payment.method === PaymentMethod.CASH);
    const changeCents = paidCents - netTotalCents;
    if (changeCents > 0 && !hasCash) throw new AppError(409, 'Pagamento acima do total so e permitido quando houver dinheiro para troco.');

    const createdSale = await tx.sale.create({
      data: {
        cashRegisterId: cashRegister.id,
        operatorId: req.user!.id,
        customerId: req.body.customerId || undefined,
        grossTotalCents,
        discountType: req.body.discountType,
        discountValue: req.body.discountValue,
        discountTotalCents,
        netTotalCents,
        items: { create: saleItems.map((item) => ({ productId: item.product.id, quantity: item.quantity, unitPriceCents: item.unitPriceCents, discountCents: item.discountCents, subtotalCents: item.subtotalCents })) },
        payments: { create: req.body.payments.map((payment: { method: PaymentMethod; amountCents: number }, index: number) => ({ method: payment.method, amountCents: payment.amountCents, changeCents: index === 0 && payment.method === PaymentMethod.CASH ? changeCents : 0 })) },
      },
      include: { items: { include: { product: true } }, payments: true, operator: { select: { id: true, name: true } } },
    });

    for (const item of saleItems) {
      await tx.product.update({ where: { id: item.product.id }, data: { stockQuantity: { decrement: item.quantity } } });
      await tx.stockMovement.create({ data: { productId: item.product.id, type: 'OUT', quantity: item.quantity, reason: 'Venda', saleId: createdSale.id, userId: req.user!.id } });
    }

    if (discountTotalCents > 0) await audit(req.user?.id, 'SALE_DISCOUNT', 'Sale', createdSale.id, { discountTotalCents });
    return createdSale;
  });

  res.status(201).json(sale);
}));

salesRouter.get('/', asyncHandler(async (req, res) => {
  const from = typeof req.query.from === 'string' ? new Date(req.query.from) : undefined;
  const to = typeof req.query.to === 'string' ? new Date(req.query.to) : undefined;
  const operatorId = typeof req.query.operatorId === 'string' ? req.query.operatorId : undefined;
  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: from, lte: to }, operatorId: req.user!.role === UserRole.CASHIER ? req.user!.id : operatorId },
    include: { operator: { select: { id: true, name: true } }, payments: true, items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(sales);
}));

salesRouter.get('/:id', validate(z.object({ params: z.object({ id: z.string() }) })), asyncHandler(async (req, res) => {
  const sale = await prisma.sale.findUnique({ where: { id: String(req.params.id) }, include: { operator: true, cashRegister: true, payments: true, items: { include: { product: true } } } });
  if (!sale) throw new AppError(404, 'Venda nao encontrada.');
  res.json(sale);
}));

salesRouter.post('/:id/cancel', validate(z.object({ params: z.object({ id: z.string() }), body: z.object({ reason: z.string().min(3).default('Cancelamento solicitado') }) })), asyncHandler(async (req, res) => {
  const sale = await prisma.$transaction(async (tx: any) => {
    const current = await tx.sale.findUnique({ where: { id: String(req.params.id) }, include: { items: true } });
    if (!current) throw new AppError(404, 'Venda nao encontrada.');
    if (current.status === 'CANCELED') throw new AppError(409, 'Venda ja cancelada.');
    for (const item of current.items) {
      await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { increment: Number(item.quantity) } } });
      await tx.stockMovement.create({ data: { productId: item.productId, type: 'CANCELATION', quantity: item.quantity, reason: `Cancelamento: ${req.body.reason}`, saleId: current.id, userId: req.user!.id } });
    }
    return tx.sale.update({ where: { id: current.id }, data: { status: 'CANCELED', canceledAt: new Date(), cancelReason: req.body.reason } });
  });
  await audit(req.user?.id, 'SALE_CANCEL', 'Sale', sale.id, { reason: req.body.reason });
  res.json(sale);
}));
