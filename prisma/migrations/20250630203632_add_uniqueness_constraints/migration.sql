/*
  Warnings:

  - A unique constraint covering the columns `[title]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Category_title_key" ON "Category"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Event_name_key" ON "Event"("name");
