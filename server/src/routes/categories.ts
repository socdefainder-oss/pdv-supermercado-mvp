import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

export const categoriesRouter = Router();
const categorySchema = z.object({ body: z.object({ name: z.string().min(2), active: z.boolean().optional() }) });

categoriesRouter.get('/', asyncHandler(async (_req, res) => {
  res.json(await prisma.category.findMany({ orderBy: { name: 'asc' } }));
}));

categoriesRouter.post('/', requireRoles(UserRole.ADMIN), validate(categorySchema), asyncHandler(async (req, res) => {
  const category = await prisma.category.create({ data: req.body });
  res.status(201).json(category);
}));

categoriesRouter.patch('/:id', requireRoles(UserRole.ADMIN), validate(z.object({ params: z.object({ id: z.string() }), body: categorySchema.shape.body.partial() })), asyncHandler(async (req, res) => {
  res.json(await prisma.category.update({ where: { id: String(req.params.id) }, data: req.body }));
}));
