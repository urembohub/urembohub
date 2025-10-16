-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "delivery_fee" DECIMAL(10,2),
ADD COLUMN     "package_tracking_history" JSONB;
