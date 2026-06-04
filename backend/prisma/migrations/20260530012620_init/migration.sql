-- DropIndex
DROP INDEX IF EXISTS "Surplus_location_idx";

-- AlterTable
ALTER TABLE "Surplus" ADD COLUMN "acceptedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Surplus_location_idx" ON "Surplus" USING GIST ("location");