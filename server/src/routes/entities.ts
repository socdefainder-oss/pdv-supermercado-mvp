import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { audit } from '../lib/audit.js';
import { requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

export const entitiesRouter = Router();

const personSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    document: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    address: z.string().optional().nullable(),
    active: z.boolean().optional(),
  }),
});

const employeeSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    document: z.string().optional().nullable(),
    roleName: z.string().min(2),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    commissionPercent: z.coerce.number().min(0).max(100).default(0),
    active: z.boolean().optional(),
  }),
});

function crudRoutes(path: string, modelName: 'customer' | 'supplier', entity: string) {
  entitiesRouter.get(`/${path}`, asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const rows = await prisma[modelName].findMany({ where: { active: req.query.active === 'all' ? undefined : true, OR: search ? [{ name: { contains: search, mode: 'insensitive' } }, { document: { contains: search } }] : undefined }, orderBy: { name: 'asc' } });
    res.json(rows);
  }));
  entitiesRouter.post(`/${path}`, requireRoles(UserRole.ADMIN), validate(personSchema), asyncHandler(async (req, res) => {
    const row = await prisma[modelName].create({ data: req.body });
    await audit(req.user?.id, 'CREATE', entity, row.id, req.body);
    res.status(201).json(row);
  }));
  entitiesRouter.patch(`/${path}/:id`, requireRoles(UserRole.ADMIN), validate(z.object({ params: z.object({ id: z.string() }), body: personSchema.shape.body.partial() })), asyncHandler(async (req, res) => {
    const row = await prisma[modelName].update({ where: { id: String(req.params.id) }, data: req.body });
    await audit(req.user?.id, 'UPDATE', entity, row.id, req.body);
    res.json(row);
  }));
}

crudRoutes('customers', 'customer', 'Customer');
crudRoutes('suppliers', 'supplier', 'Supplier');

entitiesRouter.get('/employees', requireRoles(UserRole.ADMIN), asyncHandler(async (_req, res) => {
  res.json(await prisma.employee.findMany({ orderBy: { name: 'asc' } }));
}));

entitiesRouter.post('/employees', requireRoles(UserRole.ADMIN), validate(employeeSchema), asyncHandler(async (req, res) => {
  const employee = await prisma.employee.create({ data: req.body });
  await audit(req.user?.id, 'CREATE', 'Employee', employee.id, req.body);
  res.status(201).json(employee);
}));

entitiesRouter.patch('/employees/:id', requireRoles(UserRole.ADMIN), validate(z.object({ params: z.object({ id: z.string() }), body: employeeSchema.shape.body.partial() })), asyncHandler(async (req, res) => {
  const employee = await prisma.employee.update({ where: { id: String(req.params.id) }, data: req.body });
  await audit(req.user?.id, 'UPDATE', 'Employee', employee.id, req.body);
  res.json(employee);
}));
