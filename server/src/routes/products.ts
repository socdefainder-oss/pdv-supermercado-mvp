import { Router } from 'express';
import { ProductUnit, UserRole } from '@prisma/client';
import { z } from 'zod';
import { AppError, asyncHandler } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

export const productsRouter = Router();

const productBody = z.object({
  name: z.string().min(2),
  barcode: z.string().min(3),
  categoryId: z.string().min(1),
  unit: z.nativeEnum(ProductUnit),
  costPriceCents: z.number().int().min(0),
  salePriceCents: z.number().int().positive(),
  stockQuantity: z.coerce.number().min(0),
  minStock: z.coerce.number().min(0),
  active: z.boolean().optional(),
});

productsRouter.get('/', asyncHandler(async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
  const products = await prisma.product.findMany({
    where: {
      categoryId,
      active: req.query.active === 'false' ? false : req.query.active === 'all' ? undefined : true,
      OR: search ? [{ name: { contains: search, mode: 'insensitive' } }, { barcode: { contains: search } }] : undefined,
    },
    include: { category: true },
    orderBy: { name: 'asc' },
  });
  res.json(products);
}));

productsRouter.get('/barcode/:barcode', validate(z.object({ params: z.object({ barcode: z.string() }) })), asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({ where: { barcode: String(req.params.barcode) }, include: { category: true } });
  if (!product) throw new AppError(404, 'Produto nao encontrado.');
  if (!product.active) throw new AppError(409, 'Produto inativo.');
  if (Number(product.stockQuantity) <= 0) throw new AppError(409, 'Produto sem estoque disponivel.');
  res.json(product);
}));

productsRouter.get('/:id', validate(z.object({ params: z.object({ id: z.string() }) })), asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: String(req.params.id) }, include: { category: true } });
  if (!product) throw new AppError(404, 'Produto nao encontrado.');
  res.json(product);
}));

productsRouter.post('/', requireRoles(UserRole.ADMIN), validate(z.object({ body: productBody })), asyncHandler(async (req, res) => {
  const exists = await prisma.product.findUnique({ where: { barcode: req.body.barcode } });
  if (exists) throw new AppError(409, 'Codigo de barras ja cadastrado.');
  const product = await prisma.product.create({ data: req.body, include: { category: true } });
  res.status(201).json(product);
}));

productsRouter.patch('/:id', requireRoles(UserRole.ADMIN), validate(z.object({ params: z.object({ id: z.string() }), body: productBody.partial() })), asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  if (req.body.barcode) {
    const exists = await prisma.product.findFirst({ where: { barcode: req.body.barcode, NOT: { id } } });
    if (exists) throw new AppError(409, 'Codigo de barras ja cadastrado.');
  }
  const product = await prisma.product.update({ where: { id }, data: req.body, include: { category: true } });
  res.json(product);
}));

productsRouter.patch('/:id/deactivate', requireRoles(UserRole.ADMIN), validate(z.object({ params: z.object({ id: z.string() }) })), asyncHandler(async (req, res) => {
  res.json(await prisma.product.update({ where: { id: String(req.params.id) }, data: { active: false } }));
}));
