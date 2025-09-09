/*
  Warnings:

  - A unique constraint covering the columns `[userId,ticketCategoryId]` on the table `CartItem` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_seatId_fkey";

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "ticketCategoryId" TEXT,
ALTER COLUMN "seatId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_userId_ticketCategoryId_key" ON "CartItem"("userId", "ticketCategoryId");

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_ticketCategoryId_fkey" FOREIGN KEY ("ticketCategoryId") REFERENCES "TicketCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
