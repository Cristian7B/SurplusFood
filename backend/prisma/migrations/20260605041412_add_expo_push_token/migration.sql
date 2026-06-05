/*
  Warnings:

  - You are about to drop the column `acceptedAt` on the `Surplus` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Surplus_location_idx";

-- AlterTable
ALTER TABLE "Surplus" DROP COLUMN "acceptedAt",
ADD COLUMN     "accepted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "expoPushToken" TEXT;
