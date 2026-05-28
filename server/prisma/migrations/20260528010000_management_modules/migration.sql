-- Management modules expansion: customers, suppliers, employees, stock inventory, purchases, commercial and audit.
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'LOSS';

CREATE TYPE "PurchaseOrderStatus" AS ENUM ('OPEN', 'RECEIVED', 'CANCELED');
CREATE TYPE "InventoryStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "PriceTableStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "CustomerCreditStatus" AS ENUM ('OPEN', 'PAID', 'CANCELED');

ALTER TABLE "User" ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Product" ADD COLUMN "location" TEXT, ADD COLUMN "lot" TEXT, ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "Sale" ADD COLUMN "customerId" TEXT;
ALTER TABLE "SaleItem" ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StockMovement" ADD COLUMN "lot" TEXT, ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "document" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Customer_document_key" ON "Customer"("document");
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

CREATE TABLE "Supplier" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "document" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Supplier_document_key" ON "Supplier"("document");
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");

CREATE TABLE "Employee" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "document" TEXT,
  "roleName" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "commissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Employee_document_key" ON "Employee"("document");

CREATE TABLE "Inventory" (
  "id" TEXT NOT NULL,
  "status" "InventoryStatus" NOT NULL DEFAULT 'OPEN',
  "notes" TEXT,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryItem" (
  "id" TEXT NOT NULL,
  "inventoryId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "countedQuantity" DECIMAL(12,3) NOT NULL,
  "systemQuantity" DECIMAL(12,3) NOT NULL,
  "difference" DECIMAL(12,3) NOT NULL,
  CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PurchaseOrder" (
  "id" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'OPEN',
  "totalCents" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "receivedAt" TIMESTAMP(3),
  CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PurchaseOrderItem" (
  "id" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "costPriceCents" INTEGER NOT NULL,
  "subtotalCents" INTEGER NOT NULL,
  CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Promotion" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "discountPercent" DECIMAL(5,2),
  "discountCents" INTEGER,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PriceTable" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "PriceTableStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PriceTable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PriceTableItem" (
  "id" TEXT NOT NULL,
  "priceTableId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "salePriceCents" INTEGER NOT NULL,
  CONSTRAINT "PriceTableItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerCredit" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "saleId" TEXT,
  "amountCents" INTEGER NOT NULL,
  "paidCents" INTEGER NOT NULL DEFAULT 0,
  "dueDate" TIMESTAMP(3),
  "status" "CustomerCreditStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerCredit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_entity_createdAt_idx" ON "AuditLog"("entity", "createdAt");

ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PriceTableItem" ADD CONSTRAINT "PriceTableItem_priceTableId_fkey" FOREIGN KEY ("priceTableId") REFERENCES "PriceTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PriceTableItem" ADD CONSTRAINT "PriceTableItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerCredit" ADD CONSTRAINT "CustomerCredit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerCredit" ADD CONSTRAINT "CustomerCredit_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
