-- AlterTable
ALTER TABLE "manufacturer_orders" ADD COLUMN IF NOT EXISTS "payment_status" TEXT DEFAULT 'pending';
ALTER TABLE "manufacturer_orders" ADD COLUMN IF NOT EXISTS "paystack_reference" TEXT;
ALTER TABLE "manufacturer_orders" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3);
ALTER TABLE "manufacturer_orders" ADD COLUMN IF NOT EXISTS "shipping_address" JSONB;
