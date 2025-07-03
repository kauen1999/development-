/*
  Warnings:

  - The values [MERCADOPAGO,PAGOFACIL,RAPIPAGO] on the enum `PaymentProvider` will be removed. If these variants are still used in the database, this will fail.
  - The `status` column on the `Payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'FAILED', 'CANCELLED');

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentProvider_new" AS ENUM ('STRIPE');
ALTER TABLE "Payment" ALTER COLUMN "provider" TYPE "PaymentProvider_new" USING ("provider"::text::"PaymentProvider_new");
ALTER TYPE "PaymentProvider" RENAME TO "PaymentProvider_old";
ALTER TYPE "PaymentProvider_new" RENAME TO "PaymentProvider";
DROP TYPE "PaymentProvider_old";
COMMIT;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "status",
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_eventId_idx" ON "Order"("eventId");

-- CreateIndex
CREATE INDEX "Ticket_orderItemId_idx" ON "Ticket"("orderItemId");
