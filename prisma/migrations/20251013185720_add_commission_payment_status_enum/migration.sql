/*
  Warnings:

  - The `payment_status` column on the `commission_transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."CommissionPaymentStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'reversed');

-- AlterTable
ALTER TABLE "public"."commission_transactions" DROP COLUMN "payment_status",
ADD COLUMN     "payment_status" "public"."CommissionPaymentStatus" NOT NULL DEFAULT 'pending';
