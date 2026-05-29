-- AlterTable
ALTER TABLE "Surplus" ADD COLUMN     "location" geography(Point, 4326);

-- CreateIndex
CREATE INDEX "Surplus_location_idx" ON "Surplus" USING GIST ("location");
