/*
  Warnings:

  - A unique constraint covering the columns `[paymentNumber]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentNumber_key" ON "Order"("paymentNumber");
