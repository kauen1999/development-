-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('SEATED', 'GENERAL');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "eventType" "EventType" NOT NULL DEFAULT 'GENERAL';
