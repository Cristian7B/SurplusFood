/*
  Warnings:

  - You are about to drop the column `location` on the `Surplus` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Surplus_location_idx";

-- AlterTable
ALTER TABLE "Surplus" DROP COLUMN "location";
