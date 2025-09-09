/*
  Warnings:

  - Made the column `eventId` on table `CartItem` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "CartItem" ALTER COLUMN "eventId" SET NOT NULL;
