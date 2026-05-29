// @ts-nocheck
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(dirname, '../../data');
const dataFile = path.join(dataDir, 'local-store.json');

type Entity = Record<string, any>;

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 18)}`;
}

function now() {
  return new Date().toISOString();
}

const categoryNames = ['Bebidas', 'Alimentos', 'Limpeza', 'Higiene', 'Hortifruti'];
const adminEmail = 'admin@supermercadodagente.com';
const cashierEmail = 'caixa@supermercadodagente.com';
const productSeed = [
  ['Arroz 5kg', '7891000000011', 'Alimentos', 'PCT', 1890, 2790, 60, 10],
  ['Feijao 1kg', '7891000000028', 'Alimentos', 'PCT', 590, 899, 80, 15],
  ['Coca-Cola 2L', '7891000000035', 'Bebidas', 'UN', 650, 999, 48, 12],
  ['Leite Integral 1L', '7891000000042', 'Bebidas', 'LT', 380, 549, 72, 20],
  ['Sabao em Po 1kg', '7891000000059', 'Limpeza', 'PCT', 850, 1290, 35, 8],
  ['Detergente 500ml', '7891000000066', 'Limpeza', 'UN', 160, 279, 90, 20],
  ['Papel Higienico 12un', '7891000000073', 'Higiene', 'PCT', 1390, 2190, 24, 6],
  ['Cafe 500g', '7891000000080', 'Alimentos', 'PCT', 1190, 1790, 40, 10],
  ['Acucar 1kg', '7891000000097', 'Alimentos', 'PCT', 360, 529, 65, 15],
  ['Banana KG', '7891000000103', 'Hortifruti', 'KG', 290, 499, 30, 8],
] as const;

function initialData() {
  const createdAt = now();
  const users = [
    { id: id('usr'), name: 'Administrador', email: adminEmail, passwordHash: bcrypt.hashSync('Admin@123', 10), role: 'ADMIN', active: true, discountLimitCents: 99999999, createdAt, updatedAt: createdAt },
    { id: id('usr'), name: 'Operador Caixa', email: cashierEmail, passwordHash: bcrypt.hashSync('Caixa@123', 10), role: 'CASHIER', active: true, discountLimitCents: 2000, createdAt, updatedAt: createdAt },
  ];
  const categories = categoryNames.map((name) => ({ id: id('cat'), name, active: true, createdAt, updatedAt: createdAt }));
  const products = productSeed.map(([name, barcode, categoryName, unit, costPriceCents, salePriceCents, stockQuantity, minStock]) => ({
    id: id('prd'),
    name,
    barcode,
    categoryId: categories.find((category) => category.name === categoryName)!.id,
    unit,
    costPriceCents,
    salePriceCents,
    stockQuantity,
    minStock,
    active: true,
    createdAt,
    updatedAt: createdAt,
  }));
  return { users, categories, products, customers: [], suppliers: [], employees: [], cashRegisters: [], cashMovements: [], sales: [], saleItems: [], payments: [], stockMovements: [], inventories: [], inventoryItems: [], purchaseOrders: [], purchaseOrderItems: [], promotions: [], priceTables: [], priceTableItems: [], customerCredits: [], auditLogs: [] };
}

function loadData() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify(initialData(), null, 2));
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

export class LocalStore {
  data = loadData();

  constructor() {
    for (const key of ['customers', 'suppliers', 'employees', 'inventories', 'inventoryItems', 'purchaseOrders', 'purchaseOrderItems', 'promotions', 'priceTables', 'priceTableItems', 'customerCredits', 'auditLogs']) {
      if (!this.data[key]) this.data[key] = [];
    }
    for (const user of this.data.users) if (!user.permissions) user.permissions = [];
    this.persist();
  }

  persist() {
    fs.writeFileSync(dataFile, JSON.stringify(this.data, null, 2));
  }

  withCategory(product: Entity) {
    return product ? { ...product, category: this.data.categories.find((category: Entity) => category.id === product.categoryId) } : product;
  }

  withSaleRelations(sale: Entity) {
    if (!sale) return sale;
    return {
      ...sale,
      operator: this.data.users.find((user: Entity) => user.id === sale.operatorId),
      customer: this.data.customers.find((customer: Entity) => customer.id === sale.customerId),
      cashRegister: this.data.cashRegisters.find((cashRegister: Entity) => cashRegister.id === sale.cashRegisterId),
      payments: this.data.payments.filter((payment: Entity) => payment.saleId === sale.id),
      items: this.data.saleItems.filter((item: Entity) => item.saleId === sale.id).map((item: Entity) => ({ ...item, product: this.withCategory(this.data.products.find((product: Entity) => product.id === item.productId)) })),
    };
  }

  listRows(collection: string, where: Entity = {}) {
    return this.data[collection].filter((row: Entity) => {
      if (where.id?.in && !where.id.in.includes(row.id)) return false;
      if (where.active !== undefined && row.active !== where.active) return false;
      if (where.status && row.status !== where.status) return false;
      if (where.customerId && row.customerId !== where.customerId) return false;
      if (where.supplierId && row.supplierId !== where.supplierId) return false;
      if (where.productId && row.productId !== where.productId) return false;
      if (where.createdAt?.gte && new Date(row.createdAt) < new Date(where.createdAt.gte)) return false;
      if (where.createdAt?.lte && new Date(row.createdAt) > new Date(where.createdAt.lte)) return false;
      if (where.OR) {
        const term = (where.OR[0]?.name?.contains ?? where.OR[1]?.document?.contains ?? '').toLowerCase();
        return String(row.name ?? '').toLowerCase().includes(term) || String(row.document ?? '').includes(term);
      }
      return true;
    });
  }

  crud(collection: string, prefix: string) {
    return {
      findMany: async ({ where = {} }: Entity = {}) => [...this.listRows(collection, where)].sort((a, b) => String(a.name ?? a.createdAt).localeCompare(String(b.name ?? b.createdAt))),
      findUnique: async ({ where }: Entity) => this.data[collection].find((row: Entity) => (where.id && row.id === where.id) || (where.document && row.document === where.document)) ?? null,
      findFirst: async ({ where }: Entity) => this.listRows(collection, where)[0] ?? null,
      create: async ({ data }: Entity) => { const row = { id: id(prefix), active: true, createdAt: now(), updatedAt: now(), ...data }; this.data[collection].push(row); this.persist(); return row; },
      update: async ({ where, data }: Entity) => { const row = this.data[collection].find((item: Entity) => item.id === where.id); Object.assign(row, data, { updatedAt: now() }); this.persist(); return row; },
    };
  }

  matchesProduct(product: Entity, where: Entity = {}) {
    if (where.categoryId && product.categoryId !== where.categoryId) return false;
    if (where.active !== undefined && product.active !== where.active) return false;
    if (where.id?.in && !where.id.in.includes(product.id)) return false;
    if (where.OR) {
      const term = where.OR[0]?.name?.contains?.toLowerCase() ?? where.OR[1]?.barcode?.contains ?? '';
      return product.name.toLowerCase().includes(term) || product.barcode.includes(term);
    }
    return true;
  }

  user = {
    findUnique: async ({ where }: Entity) => this.data.users.find((user: Entity) => (where.email && user.email === where.email) || (where.id && user.id === where.id)) ?? null,
    findMany: async () => [...this.data.users].sort((a, b) => a.name.localeCompare(b.name)),
    create: async ({ data }: Entity) => { const user = { id: id('usr'), active: true, createdAt: now(), updatedAt: now(), ...data }; this.data.users.push(user); this.persist(); return user; },
    update: async ({ where, data }: Entity) => { const user = this.data.users.find((row: Entity) => row.id === where.id); Object.assign(user, data, { updatedAt: now() }); this.persist(); return user; },
  };

  category = {
    findMany: async () => [...this.data.categories].sort((a, b) => a.name.localeCompare(b.name)),
    create: async ({ data }: Entity) => { const category = { id: id('cat'), active: true, createdAt: now(), updatedAt: now(), ...data }; this.data.categories.push(category); this.persist(); return category; },
    update: async ({ where, data }: Entity) => { const category = this.data.categories.find((row: Entity) => row.id === where.id); Object.assign(category, data, { updatedAt: now() }); this.persist(); return category; },
  };

  product = {
    findMany: async ({ where = {} }: Entity = {}) => this.data.products.filter((product: Entity) => this.matchesProduct(product, where)).sort((a, b) => a.name.localeCompare(b.name)).map((product: Entity) => this.withCategory(product)),
    findUnique: async ({ where }: Entity) => this.withCategory(this.data.products.find((product: Entity) => (where.id && product.id === where.id) || (where.barcode && product.barcode === where.barcode))) ?? null,
    findFirst: async ({ where }: Entity) => this.withCategory(this.data.products.find((product: Entity) => product.barcode === where.barcode && product.id !== where.NOT?.id)) ?? null,
    create: async ({ data }: Entity) => { const product = { id: id('prd'), active: true, createdAt: now(), updatedAt: now(), ...data }; this.data.products.push(product); this.persist(); return this.withCategory(product); },
    update: async ({ where, data }: Entity) => { const product = this.data.products.find((row: Entity) => row.id === where.id); if (data.stockQuantity?.decrement !== undefined) product.stockQuantity = Number(product.stockQuantity) - Number(data.stockQuantity.decrement); else if (data.stockQuantity?.increment !== undefined) product.stockQuantity = Number(product.stockQuantity) + Number(data.stockQuantity.increment); else Object.assign(product, data); product.updatedAt = now(); this.persist(); return this.withCategory(product); },
  };

  customer = this.crud('customers', 'cus');
  supplier = this.crud('suppliers', 'sup');
  employee = this.crud('employees', 'emp');

  cashRegister = {
    findMany: async ({ where = {} }: Entity = {}) => this.data.cashRegisters.filter((cashRegister: Entity) => (!where.operatorId || cashRegister.operatorId === where.operatorId) && (!where.status || cashRegister.status === where.status)).map((cashRegister: Entity) => ({ ...cashRegister, operator: this.data.users.find((user: Entity) => user.id === cashRegister.operatorId) })),
    findFirst: async ({ where }: Entity) => this.data.cashRegisters.find((cashRegister: Entity) => (!where.operatorId || cashRegister.operatorId === where.operatorId) && (!where.status || cashRegister.status === where.status)) ?? null,
    findUnique: async ({ where }: Entity) => { const cashRegister = this.data.cashRegisters.find((row: Entity) => row.id === where.id); return cashRegister ? { ...cashRegister, operator: this.data.users.find((user: Entity) => user.id === cashRegister.operatorId) } : null; },
    create: async ({ data }: Entity) => { const cashRegister = { id: id('cash'), status: 'OPEN', openedAt: now(), closedAt: null, ...data }; this.data.cashRegisters.push(cashRegister); this.persist(); return { ...cashRegister, operator: this.data.users.find((user: Entity) => user.id === cashRegister.operatorId) }; },
    update: async ({ where, data }: Entity) => { const cashRegister = this.data.cashRegisters.find((row: Entity) => row.id === where.id); Object.assign(cashRegister, data); this.persist(); return cashRegister; },
  };

  cashMovement = {
    findMany: async ({ where }: Entity) => this.data.cashMovements.filter((movement: Entity) => !where.cashRegisterId || movement.cashRegisterId === where.cashRegisterId),
    create: async ({ data }: Entity) => { const movement = { id: id('mov'), createdAt: now(), ...data }; this.data.cashMovements.push(movement); this.persist(); return movement; },
  };

  sale = {
    create: async ({ data }: Entity) => {
      const sale = { id: id('sale'), status: 'COMPLETED', createdAt: now(), canceledAt: null, cancelReason: null, cashRegisterId: data.cashRegisterId, operatorId: data.operatorId, customerId: data.customerId ?? null, grossTotalCents: data.grossTotalCents, discountType: data.discountType, discountValue: data.discountValue, discountTotalCents: data.discountTotalCents, netTotalCents: data.netTotalCents };
      this.data.sales.push(sale);
      for (const itemData of data.items.create) this.data.saleItems.push({ id: id('item'), saleId: sale.id, ...itemData });
      for (const paymentData of data.payments.create) this.data.payments.push({ id: id('pay'), saleId: sale.id, createdAt: now(), ...paymentData });
      this.persist();
      return this.withSaleRelations(sale);
    },
    findMany: async ({ where = {} }: Entity = {}) => this.data.sales.filter((sale: Entity) => {
      if (where.cashRegisterId && sale.cashRegisterId !== where.cashRegisterId) return false;
      if (where.status && sale.status !== where.status) return false;
      if (where.operatorId && sale.operatorId !== where.operatorId) return false;
      if (where.createdAt?.gte && new Date(sale.createdAt) < new Date(where.createdAt.gte)) return false;
      if (where.createdAt?.lte && new Date(sale.createdAt) > new Date(where.createdAt.lte)) return false;
      if (where.createdAt?.lt && new Date(sale.createdAt) >= new Date(where.createdAt.lt)) return false;
      if (where.payments?.some?.method && !this.data.payments.some((payment: Entity) => payment.saleId === sale.id && payment.method === where.payments.some.method)) return false;
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((sale: Entity) => this.withSaleRelations(sale)),
    findUnique: async ({ where }: Entity) => this.withSaleRelations(this.data.sales.find((sale: Entity) => sale.id === where.id)) ?? null,
    update: async ({ where, data }: Entity) => { const sale = this.data.sales.find((row: Entity) => row.id === where.id); Object.assign(sale, data); this.persist(); return this.withSaleRelations(sale); },
  };

  saleItem = {
    groupBy: async () => {
      const map = new Map<string, { productId: string; quantity: number; subtotalCents: number }>();
      for (const item of this.data.saleItems) {
        const current = map.get(item.productId) ?? { productId: item.productId, quantity: 0, subtotalCents: 0 };
        current.quantity += Number(item.quantity);
        current.subtotalCents += item.subtotalCents;
        map.set(item.productId, current);
      }
      return [...map.values()].sort((a, b) => b.subtotalCents - a.subtotalCents).map((item) => ({ productId: item.productId, _sum: { quantity: item.quantity, subtotalCents: item.subtotalCents } }));
    },
  };

  payment = {};

  stockMovement = {
    findMany: async ({ where = {} }: Entity = {}) => this.data.stockMovements.filter((row: Entity) => (!where.productId || row.productId === where.productId)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((row: Entity) => ({ ...row, product: this.withCategory(this.data.products.find((product: Entity) => product.id === row.productId)), user: this.data.users.find((user: Entity) => user.id === row.userId) })),
    create: async ({ data }: Entity) => { const movement = { id: id('stk'), createdAt: now(), ...data }; this.data.stockMovements.push(movement); this.persist(); return movement; },
  };

  inventory = {
    findMany: async () => this.data.inventories.map((inventory: Entity) => ({ ...inventory, items: this.data.inventoryItems.filter((item: Entity) => item.inventoryId === inventory.id) })),
    create: async ({ data }: Entity) => { const inventory = { id: id('inv'), status: data.status ?? 'CLOSED', notes: data.notes ?? null, userId: data.userId, createdAt: now(), closedAt: data.closedAt ?? now() }; this.data.inventories.push(inventory); for (const item of data.items?.create ?? []) this.data.inventoryItems.push({ id: id('invi'), inventoryId: inventory.id, ...item }); this.persist(); return { ...inventory, items: this.data.inventoryItems.filter((item: Entity) => item.inventoryId === inventory.id) }; },
  };

  auditLog = {
    findMany: async () => [...this.data.auditLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    create: async ({ data }: Entity) => { const row = { id: id('aud'), createdAt: now(), ...data }; this.data.auditLogs.push(row); this.persist(); return row; },
  };

  purchaseOrder = {
    findMany: async () => this.data.purchaseOrders.map((order: Entity) => ({ ...order, supplier: this.data.suppliers.find((supplier: Entity) => supplier.id === order.supplierId), items: this.data.purchaseOrderItems.filter((item: Entity) => item.purchaseOrderId === order.id).map((item: Entity) => ({ ...item, product: this.withCategory(this.data.products.find((product: Entity) => product.id === item.productId)) })) })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    findUnique: async ({ where }: Entity) => { const order = this.data.purchaseOrders.find((row: Entity) => row.id === where.id); return order ? { ...order, items: this.data.purchaseOrderItems.filter((item: Entity) => item.purchaseOrderId === order.id) } : null; },
    create: async ({ data }: Entity) => { const order = { id: id('po'), status: data.status ?? 'OPEN', totalCents: data.totalCents ?? 0, supplierId: data.supplierId, notes: data.notes ?? null, createdAt: now(), receivedAt: null }; this.data.purchaseOrders.push(order); for (const item of data.items?.create ?? []) this.data.purchaseOrderItems.push({ id: id('poi'), purchaseOrderId: order.id, ...item }); this.persist(); return { ...order, items: this.data.purchaseOrderItems.filter((item: Entity) => item.purchaseOrderId === order.id) }; },
    update: async ({ where, data }: Entity) => { const order = this.data.purchaseOrders.find((row: Entity) => row.id === where.id); Object.assign(order, data); this.persist(); return order; },
  };

  promotion = this.crud('promotions', 'pro');
  priceTable = {
    findMany: async () => this.data.priceTables.map((table: Entity) => ({ ...table, items: this.data.priceTableItems.filter((item: Entity) => item.priceTableId === table.id) })),
    create: async ({ data }: Entity) => { const table = { id: id('pt'), status: data.status ?? 'ACTIVE', name: data.name, createdAt: now() }; this.data.priceTables.push(table); for (const item of data.items?.create ?? []) this.data.priceTableItems.push({ id: id('pti'), priceTableId: table.id, ...item }); this.persist(); return { ...table, items: this.data.priceTableItems.filter((item: Entity) => item.priceTableId === table.id) }; },
  };
  customerCredit = this.crud('customerCredits', 'cred');

  async $transaction(callback: (tx: LocalStore) => Promise<unknown>) {
    return callback(this);
  }
}
