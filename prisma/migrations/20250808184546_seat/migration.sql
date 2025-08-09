-- DropForeignKey
ALTER TABLE "Seat" DROP CONSTRAINT "Seat_userId_fkey";

-- AlterTable
ALTER TABLE "Seat" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
