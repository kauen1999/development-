/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the `Example` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_CategoryToEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_EnrolledIn` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "_CategoryToEvent" DROP CONSTRAINT "_CategoryToEvent_A_fkey";

-- DropForeignKey
ALTER TABLE "_CategoryToEvent" DROP CONSTRAINT "_CategoryToEvent_B_fkey";

-- DropForeignKey
ALTER TABLE "_EnrolledIn" DROP CONSTRAINT "_EnrolledIn_A_fkey";

-- DropForeignKey
ALTER TABLE "_EnrolledIn" DROP CONSTRAINT "_EnrolledIn_B_fkey";

-- DropIndex
DROP INDEX "Event_name_key";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "saleEnd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "saleStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "slug" TEXT NOT NULL DEFAULT '';

-- DropTable
DROP TABLE "Example";

-- DropTable
DROP TABLE "_CategoryToEvent";

-- DropTable
DROP TABLE "_EnrolledIn";

-- CreateTable
CREATE TABLE "_EnrolledUsers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_EventCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_EnrolledUsers_AB_unique" ON "_EnrolledUsers"("A", "B");

-- CreateIndex
CREATE INDEX "_EnrolledUsers_B_index" ON "_EnrolledUsers"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_EventCategories_AB_unique" ON "_EventCategories"("A", "B");

-- CreateIndex
CREATE INDEX "_EventCategories_B_index" ON "_EventCategories"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- AddForeignKey
ALTER TABLE "_EnrolledUsers" ADD CONSTRAINT "_EnrolledUsers_A_fkey" FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EnrolledUsers" ADD CONSTRAINT "_EnrolledUsers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventCategories" ADD CONSTRAINT "_EventCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventCategories" ADD CONSTRAINT "_EventCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
