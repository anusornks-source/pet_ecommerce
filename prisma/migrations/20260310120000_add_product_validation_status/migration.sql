-- AlterTable
ALTER TABLE "products" ADD COLUMN "validationStatus" "ProductValidationStatus" NOT NULL DEFAULT 'Approved';

-- CreateIndex
CREATE INDEX "products_active_validationStatus_idx" ON "products"("active", "validationStatus");
