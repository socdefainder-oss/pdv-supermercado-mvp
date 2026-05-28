-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CASHIER');

-- CreateEnum
CREATE TYPE "ProductUnit" AS ENUM ('UN', 'KG', 'CX', 'LT', 'ML', 'PCT');

-- CreateEnum
CREATE TYPE "CashRegisterStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('SUPPLY', 'WITHDRAW');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('NONE', 'FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'PIX');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'CANCELATION');

-- CreateTable
CREATE TABLE "User" (
	"id" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"email" TEXT NOT NULL,
	"passwordHash" TEXT NOT NULL,
	"role" "UserRole" NOT NULL,
	"active" BOOLEAN NOT NULL DEFAULT true,
	"discountLimitCents" INTEGER NOT NULL DEFAULT 2000,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
	"id" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"active" BOOLEAN NOT NULL DEFAULT true,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
	"id" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"barcode" TEXT NOT NULL,
	"categoryId" TEXT NOT NULL,
	"unit" "ProductUnit" NOT NULL,
	"costPriceCents" INTEGER NOT NULL,
	"salePriceCents" INTEGER NOT NULL,
	"stockQuantity" DECIMAL(12,3) NOT NULL,
	"minStock" DECIMAL(12,3) NOT NULL,
	"active" BOOLEAN NOT NULL DEFAULT true,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashRegister" (
	"id" TEXT NOT NULL,
	"operatorId" TEXT NOT NULL,
	"openingAmountCents" INTEGER NOT NULL,
	"closingAmountCents" INTEGER,
	"expectedCashCents" INTEGER,
	"differenceCents" INTEGER,
	"status" "CashRegisterStatus" NOT NULL DEFAULT 'OPEN',
	"openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"closedAt" TIMESTAMP(3),

	CONSTRAINT "CashRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashMovement" (
	"id" TEXT NOT NULL,
	"cashRegisterId" TEXT NOT NULL,
	"type" "CashMovementType" NOT NULL,
	"amountCents" INTEGER NOT NULL,
	"reason" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
	"id" TEXT NOT NULL,
	"cashRegisterId" TEXT NOT NULL,
	"operatorId" TEXT NOT NULL,
	"grossTotalCents" INTEGER NOT NULL,
	"discountType" "DiscountType" NOT NULL DEFAULT 'NONE',
	"discountValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
	"discountTotalCents" INTEGER NOT NULL DEFAULT 0,
	"netTotalCents" INTEGER NOT NULL,
	"status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
	"canceledAt" TIMESTAMP(3),
	"cancelReason" TEXT,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
	"id" TEXT NOT NULL,
	"saleId" TEXT NOT NULL,
	"productId" TEXT NOT NULL,
	"quantity" DECIMAL(12,3) NOT NULL,
	"unitPriceCents" INTEGER NOT NULL,
	"subtotalCents" INTEGER NOT NULL,

	CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
	"id" TEXT NOT NULL,
	"saleId" TEXT NOT NULL,
	"method" "PaymentMethod" NOT NULL,
	"amountCents" INTEGER NOT NULL,
	"changeCents" INTEGER NOT NULL DEFAULT 0,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
	"id" TEXT NOT NULL,
	"productId" TEXT NOT NULL,
	"type" "StockMovementType" NOT NULL,
	"quantity" DECIMAL(12,3) NOT NULL,
	"reason" TEXT NOT NULL,
	"saleId" TEXT,
	"userId" TEXT NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "CashRegister_operatorId_status_idx" ON "CashRegister"("operatorId", "status");

-- CreateIndex
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");

-- CreateIndex
CREATE INDEX "Sale_operatorId_idx" ON "Sale"("operatorId");

-- CreateIndex
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegister" ADD CONSTRAINT "CashRegister_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
