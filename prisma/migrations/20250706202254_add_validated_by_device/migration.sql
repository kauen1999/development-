/*
  Warnings:

  - You are about to drop the column `validadorId` on the `Ticket` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_validadorId_fkey";

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "validadorId",
ADD COLUMN     "validatedById" TEXT;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
