import { Router } from 'express';
import { CashMovementType } from '@prisma/client';
import { z } from 'zod';
import { AppError, asyncHandler } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { getCashSummary } from '../services/cashSummary.js';
import { validate } from '../middleware/validate.js';

export const cashRegisterRouter = Router();

const amountBody = z.object({ amountCents: z.number().int().min(0), reason: z.string().min(3).optional() });

cashRegisterRouter.post('/open', validate(z.object({ body: z.object({ openingAmountCents: z.number().int().min(0) }) })), asyncHandler(async (req, res) => {
  const opened = await prisma.cashRegister.findFirst({ where: { operatorId: req.user!.id, status: 'OPEN' } });
  if (opened) throw new AppError(409, 'Este operador ja possui caixa aberto.');
  const cashRegister = await prisma.cashRegister.create({ data: { operatorId: req.user!.id, openingAmountCents: req.body.openingAmountCents }, include: { operator: true } });
  console.info('cash_register_opened', { cashRegisterId: cashRegister.id, userId: req.user!.id });
  res.status(201).json(cashRegister);
}));

cashRegisterRouter.get('/current', asyncHandler(async (req, res) => {
  const cashRegister = await prisma.cashRegister.findFirst({ where: { operatorId: req.user!.id, status: 'OPEN' }, include: { operator: { select: { id: true, name: true } } } });
  res.json(cashRegister);
}));

cashRegisterRouter.post('/:id/supply', validate(z.object({ params: z.object({ id: z.string() }), body: amountBody })), asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const cashRegister = await prisma.cashRegister.findUnique({ where: { id } });
  if (!cashRegister || cashRegister.status !== 'OPEN') throw new AppError(409, 'Caixa nao esta aberto.');
  const movement = await prisma.cashMovement.create({ data: { cashRegisterId: id, type: CashMovementType.SUPPLY, amountCents: req.body.amountCents, reason: req.body.reason ?? 'Suprimento', userId: req.user!.id } });
  console.info('cash_supply', { cashRegisterId: id, userId: req.user!.id, amountCents: req.body.amountCents });
  res.status(201).json(movement);
}));

cashRegisterRouter.post('/:id/withdraw', validate(z.object({ params: z.object({ id: z.string() }), body: amountBody.extend({ reason: z.string().min(3) }) })), asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const summary = await getCashSummary(prisma, id);
  if (!summary || summary.cashRegister.status !== 'OPEN') throw new AppError(409, 'Caixa nao esta aberto.');
  if (req.body.amountCents > summary.expectedCashCents) throw new AppError(409, 'Sangria maior que o saldo em dinheiro estimado.');
  const movement = await prisma.cashMovement.create({ data: { cashRegisterId: id, type: CashMovementType.WITHDRAW, amountCents: req.body.amountCents, reason: req.body.reason, userId: req.user!.id } });
  console.info('cash_withdraw', { cashRegisterId: id, userId: req.user!.id, amountCents: req.body.amountCents });
  res.status(201).json(movement);
}));

cashRegisterRouter.post('/:id/close', validate(z.object({ params: z.object({ id: z.string() }), body: z.object({ closingAmountCents: z.number().int().min(0) }) })), asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const summary = await getCashSummary(prisma, id);
  if (!summary || summary.cashRegister.status !== 'OPEN') throw new AppError(409, 'Caixa nao esta aberto.');
  const differenceCents = req.body.closingAmountCents - summary.expectedCashCents;
  const cashRegister = await prisma.cashRegister.update({ where: { id }, data: { status: 'CLOSED', closedAt: new Date(), closingAmountCents: req.body.closingAmountCents, expectedCashCents: summary.expectedCashCents, differenceCents } });
  console.info('cash_register_closed', { cashRegisterId: id, userId: req.user!.id, differenceCents });
  res.json({ ...summary, cashRegister: { ...summary.cashRegister, ...cashRegister }, differenceCents });
}));

cashRegisterRouter.get('/:id/summary', validate(z.object({ params: z.object({ id: z.string() }) })), asyncHandler(async (req, res) => {
  const summary = await getCashSummary(prisma, String(req.params.id));
  if (!summary) throw new AppError(404, 'Caixa nao encontrado.');
  res.json(summary);
}));
