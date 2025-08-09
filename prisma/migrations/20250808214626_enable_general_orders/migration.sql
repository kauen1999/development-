/*
  Warnings:

  - A unique constraint covering the columns `[orderId,ticketCategoryId]` on the table `OrderItem` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_seatId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_seatId_fkey";

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "qty" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "ticketCategoryId" TEXT,
ALTER COLUMN "seatId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "ticketCategoryId" TEXT,
ALTER COLUMN "seatId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_orderId_ticketCategoryId_key" ON "OrderItem"("orderId", "ticketCategoryId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_ticketCategoryId_fkey" FOREIGN KEY ("ticketCategoryId") REFERENCES "TicketCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ticketCategoryId_fkey" FOREIGN KEY ("ticketCategoryId") REFERENCES "TicketCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
