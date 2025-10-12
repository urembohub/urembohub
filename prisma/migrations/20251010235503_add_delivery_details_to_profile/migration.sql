-- AlterTable
ALTER TABLE "public"."profiles" ADD COLUMN     "delivery_details" JSONB,
ADD COLUMN     "delivery_details_verified" BOOLEAN DEFAULT false,
ADD COLUMN     "delivery_method" TEXT;
