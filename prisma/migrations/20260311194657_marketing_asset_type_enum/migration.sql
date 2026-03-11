-- CreateEnum
CREATE TYPE "MarketingAssetType" AS ENUM ('IMAGE', 'VIDEO', 'PDF');

-- AlterTable
ALTER TABLE "marketing_assets" ALTER COLUMN "type" TYPE "MarketingAssetType" USING "type"::"MarketingAssetType";
