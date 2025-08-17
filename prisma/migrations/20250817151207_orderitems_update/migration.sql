/*
  Warnings:

  - Added the required column `amount` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "conceptId" TEXT NOT NULL DEFAULT 'woocommerce',
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'ARS',
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "externalReference" TEXT,
ADD COLUMN     "title" TEXT NOT NULL;
