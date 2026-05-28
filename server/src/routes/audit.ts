import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { asyncHandler } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { requireRoles } from '../middleware/auth.js';

export const auditRouter = Router();
auditRouter.use(requireRoles(UserRole.ADMIN));

auditRouter.get('/', asyncHandler(async (_req, res) => {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { user: { select: { name: true, email: true } } } });
  res.json(logs);
}));
