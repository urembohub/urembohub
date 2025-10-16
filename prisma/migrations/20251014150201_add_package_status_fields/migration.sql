-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "package_receipt_no" TEXT,
ADD COLUMN     "package_status" TEXT,
ADD COLUMN     "package_tracking_id" TEXT,
ADD COLUMN     "package_tracking_link" TEXT;
