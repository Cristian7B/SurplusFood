-- CreateEnum
CREATE TYPE "SurplusStatus" AS ENUM ('PUBLISHED', 'ASSIGNED', 'PICKED_UP', 'EXPIRED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isVerifiedCharity" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "noShowCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reliabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Surplus" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "quantityKg" DOUBLE PRECISION NOT NULL,
    "quantityUnits" INTEGER,
    "foodType" TEXT NOT NULL,
    "expirationAt" TIMESTAMP(3) NOT NULL,
    "pickupStartAt" TIMESTAMP(3) NOT NULL,
    "pickupEndAt" TIMESTAMP(3) NOT NULL,
    "status" "SurplusStatus" NOT NULL DEFAULT 'PUBLISHED',
    "donorId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Surplus_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Surplus" ADD CONSTRAINT "Surplus_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Surplus" ADD CONSTRAINT "Surplus_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography column to Surplus
ALTER TABLE "Surplus" ADD COLUMN "location" geography(Point, 4326);

-- Create spatial index on location
CREATE INDEX "Surplus_location_idx" ON "Surplus" USING GIST ("location");
