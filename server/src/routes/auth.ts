import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../env.js';
import { AppError, asyncHandler } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

export const authRouter = Router();

const loginSchema = z.object({
  body: z.object({ email: z.string().email(), password: z.string().min(1) }),
});

authRouter.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (!user || !user.active) throw new AppError(401, 'E-mail ou senha invalidos.');
  const valid = await bcrypt.compare(req.body.password, user.passwordHash);
  if (!valid) throw new AppError(401, 'E-mail ou senha invalidos.');

  const token = jwt.sign({ role: user.role }, env.JWT_SECRET, { subject: user.id, expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, discountLimitCents: user.discountLimitCents } });
}));

authRouter.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  res.json({ user: req.user });
}));
