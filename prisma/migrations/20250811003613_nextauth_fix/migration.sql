/*
  Warnings:

  - You are about to drop the column `sessionId` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `Seat` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `eventId` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `venueName` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the `AccountSession` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[provider,providerAccountId]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sessionToken]` on the table `Session` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `eventSessionId` to the `CartItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventSessionId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventSessionId` to the `Seat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expires` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionToken` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventSessionId` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AccountSession" DROP CONSTRAINT "AccountSession_userId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "Seat" DROP CONSTRAINT "Seat_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_sessionId_fkey";

-- DropIndex
DROP INDEX "Seat_sessionId_status_idx";

-- DropIndex
DROP INDEX "Session_eventId_idx";

-- AlterTable
ALTER TABLE "CartItem" DROP COLUMN "sessionId",
ADD COLUMN     "eventSessionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "sessionId",
ADD COLUMN     "eventSessionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Seat" DROP COLUMN "sessionId",
ADD COLUMN     "eventSessionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "city",
DROP COLUMN "createdAt",
DROP COLUMN "date",
DROP COLUMN "eventId",
DROP COLUMN "updatedAt",
DROP COLUMN "venueName",
ADD COLUMN     "expires" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "sessionToken" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "sessionId",
ADD COLUMN     "eventSessionId" TEXT NOT NULL;

-- DropTable
DROP TABLE "AccountSession";

-- CreateTable
CREATE TABLE "EventSession" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "venueName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "EventSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventSession_eventId_idx" ON "EventSession"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "Seat_eventSessionId_status_idx" ON "Seat"("eventSessionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSession" ADD CONSTRAINT "EventSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_eventSessionId_fkey" FOREIGN KEY ("eventSessionId") REFERENCES "EventSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_eventSessionId_fkey" FOREIGN KEY ("eventSessionId") REFERENCES "EventSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_eventSessionId_fkey" FOREIGN KEY ("eventSessionId") REFERENCES "EventSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_eventSessionId_fkey" FOREIGN KEY ("eventSessionId") REFERENCES "EventSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
