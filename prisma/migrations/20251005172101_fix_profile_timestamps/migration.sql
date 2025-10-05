/*
  Warnings:

  - Made the column `created_at` on table `profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `profiles` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."appointments" ALTER COLUMN "currency" SET DEFAULT 'KES';

-- AlterTable
ALTER TABLE "public"."manufacturer_orders" ALTER COLUMN "currency" SET DEFAULT 'KES';

-- AlterTable
ALTER TABLE "public"."order_items" ALTER COLUMN "currency" SET DEFAULT 'KES';

-- AlterTable
ALTER TABLE "public"."products" ALTER COLUMN "currency" SET DEFAULT 'KES';

-- AlterTable
ALTER TABLE "public"."profiles" ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."service_appointments" ALTER COLUMN "currency" SET DEFAULT 'KES';

-- AlterTable
ALTER TABLE "public"."services" ALTER COLUMN "currency" SET DEFAULT 'KES';
