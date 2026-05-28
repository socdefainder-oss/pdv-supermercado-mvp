import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { env } from '../env.js';
import { AppError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

export type AuthUser = { id: string; name: string; email: string; role: UserRole; discountLimitCents: number };

export type AuthenticatedRequest = Request & { user: AuthUser };

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new AppError(401, 'Sessao nao autenticada.'));

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) return next(new AppError(401, 'Usuario inativo ou inexistente.'));
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role, discountLimitCents: user.discountLimitCents };
    return next();
  } catch {
    return next(new AppError(401, 'Token invalido ou expirado.'));
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'Sessao nao autenticada.'));
    if (!roles.includes(req.user.role)) return next(new AppError(403, 'Permissao insuficiente.'));
    return next();
  };
}
