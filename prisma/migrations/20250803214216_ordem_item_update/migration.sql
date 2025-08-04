/*
  Warnings:

  - A unique constraint covering the columns `[externalTransactionId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[orderId,seatId]` on the table `OrderItem` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "OrderItem_orderId_idx";

-- DropIndex
DROP INDEX "OrderItem_seatId_key";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "externalTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_externalTransactionId_key" ON "Order"("externalTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_orderId_seatId_key" ON "OrderItem"("orderId", "seatId");
