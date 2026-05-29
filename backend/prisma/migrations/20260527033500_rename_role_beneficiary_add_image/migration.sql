-- Rename RECIPIENT to BENEFICIARY in Role enum
ALTER TYPE "Role" RENAME VALUE 'RECIPIENT' TO 'BENEFICIARY';

-- Step 3: Add imageUrl column to Surplus
ALTER TABLE "Surplus" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
