-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "device" TEXT,
ADD COLUMN     "validadorId" TEXT;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_validadorId_fkey" FOREIGN KEY ("validadorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
