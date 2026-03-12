ALTER TABLE "manufacturer_orders"
ADD COLUMN IF NOT EXISTS "manufacturer_stock_deducted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "retailer_stock_adjusted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "retailer_received_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "retailer_product_id" TEXT;
