/*
  Warnings:

  - You are about to drop the column `DNI` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `DNIName` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "DNI",
DROP COLUMN "DNIName",
ADD COLUMN     "dni" TEXT,
ADD COLUMN     "dniName" TEXT;
