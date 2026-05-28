import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

export const usersRouter = Router();
usersRouter.use(requireRoles(UserRole.ADMIN));

const createUserSchema = z.object({ body: z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(6), role: z.nativeEnum(UserRole), discountLimitCents: z.number().int().min(0).default(2000) }) });
const updateUserSchema = z.object({ params: z.object({ id: z.string() }), body: z.object({ name: z.string().min(2).optional(), role: z.nativeEnum(UserRole).optional(), active: z.boolean().optional(), discountLimitCents: z.number().int().min(0).optional() }) });

usersRouter.post('/', validate(createUserSchema), asyncHandler(async (req, res) => {
  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const { password, ...data } = req.body;
  const user = await prisma.user.create({ data: { ...data, passwordHash }, select: { id: true, name: true, email: true, role: true, active: true, discountLimitCents: true } });
  res.status(201).json(user);
}));

usersRouter.get('/', asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, role: true, active: true, discountLimitCents: true, createdAt: true } });
  res.json(users);
}));

usersRouter.patch('/:id', validate(updateUserSchema), asyncHandler(async (req, res) => {
  const user = await prisma.user.update({ where: { id: String(req.params.id) }, data: req.body, select: { id: true, name: true, email: true, role: true, active: true, discountLimitCents: true } });
  res.json(user);
}));

usersRouter.patch('/:id/deactivate', validate(z.object({ params: z.object({ id: z.string() }) })), asyncHandler(async (req, res) => {
  const user = await prisma.user.update({ where: { id: String(req.params.id) }, data: { active: false }, select: { id: true, active: true } });
  res.json(user);
}));
