-- AlterTable
ALTER TABLE "manufacturer_orders" ADD COLUMN "payment_status" TEXT DEFAULT 'pending';
ALTER TABLE "manufacturer_orders" ADD COLUMN "paystack_reference" TEXT;
ALTER TABLE "manufacturer_orders" ADD COLUMN "paid_at" TIMESTAMP(3);
ALTER TABLE "manufacturer_orders" ADD COLUMN "shipping_address" JSONB;



