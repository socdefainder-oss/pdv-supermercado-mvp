import bcrypt from 'bcryptjs';
import { PrismaClient, ProductUnit, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const categories = ['Bebidas', 'Alimentos', 'Limpeza', 'Higiene', 'Hortifruti'];

const products = [
  ['Arroz 5kg', '7891000000011', 'Alimentos', ProductUnit.PCT, 1890, 2790, '60', '10'],
  ['Feijao 1kg', '7891000000028', 'Alimentos', ProductUnit.PCT, 590, 899, '80', '15'],
  ['Coca-Cola 2L', '7891000000035', 'Bebidas', ProductUnit.UN, 650, 999, '48', '12'],
  ['Leite Integral 1L', '7891000000042', 'Bebidas', ProductUnit.LT, 380, 549, '72', '20'],
  ['Sabao em Po 1kg', '7891000000059', 'Limpeza', ProductUnit.PCT, 850, 1290, '35', '8'],
  ['Detergente 500ml', '7891000000066', 'Limpeza', ProductUnit.UN, 160, 279, '90', '20'],
  ['Papel Higienico 12un', '7891000000073', 'Higiene', ProductUnit.PCT, 1390, 2190, '24', '6'],
  ['Cafe 500g', '7891000000080', 'Alimentos', ProductUnit.PCT, 1190, 1790, '40', '10'],
  ['Acucar 1kg', '7891000000097', 'Alimentos', ProductUnit.PCT, 360, 529, '65', '15'],
  ['Banana KG', '7891000000103', 'Hortifruti', ProductUnit.KG, 290, 499, '30', '8'],
] as const;

async function main() {
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const cashierHash = await bcrypt.hash('Caixa@123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@supermercado.com' },
    update: {},
    create: { name: 'Administrador', email: 'admin@supermercado.com', passwordHash: adminHash, role: UserRole.ADMIN, discountLimitCents: 99999999 },
  });

  await prisma.user.upsert({
    where: { email: 'caixa@supermercado.com' },
    update: {},
    create: { name: 'Operador Caixa', email: 'caixa@supermercado.com', passwordHash: cashierHash, role: UserRole.CASHIER, discountLimitCents: 2000 },
  });

  for (const name of categories) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  const categoryMap = new Map((await prisma.category.findMany()).map((category) => [category.name, category.id]));

  for (const [name, barcode, categoryName, unit, costPriceCents, salePriceCents, stockQuantity, minStock] of products) {
    await prisma.product.upsert({
      where: { barcode },
      update: {},
      create: {
        name,
        barcode,
        categoryId: categoryMap.get(categoryName)!,
        unit,
        costPriceCents,
        salePriceCents,
        stockQuantity,
        minStock,
      },
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
