-- DropForeignKey
ALTER TABLE "Seat" DROP CONSTRAINT "Seat_eventId_fkey";

-- AlterTable
ALTER TABLE "Seat" ALTER COLUMN "eventId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
