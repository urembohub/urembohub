-- CreateEnum
CREATE TYPE "public"."VerificationStatus" AS ENUM ('pending', 'verified', 'failed', 'expired');

-- CreateTable
CREATE TABLE "public"."payment_verification_queue" (
    "id" TEXT NOT NULL,
    "package_id" INTEGER NOT NULL,
    "order_id" TEXT NOT NULL,
    "retailer_id" TEXT NOT NULL,
    "transcode" TEXT,
    "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMP(3),
    "status" "public"."VerificationStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 20,
    "error_message" TEXT,

    CONSTRAINT "payment_verification_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_verification_queue_status_last_checked_at_idx" ON "public"."payment_verification_queue"("status", "last_checked_at");

-- CreateIndex
CREATE INDEX "payment_verification_queue_package_id_idx" ON "public"."payment_verification_queue"("package_id");

-- CreateIndex
CREATE INDEX "payment_verification_queue_order_id_idx" ON "public"."payment_verification_queue"("order_id");

-- CreateIndex
CREATE INDEX "payment_verification_queue_retailer_id_idx" ON "public"."payment_verification_queue"("retailer_id");

-- AddForeignKey
ALTER TABLE "public"."payment_verification_queue" ADD CONSTRAINT "payment_verification_queue_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_verification_queue" ADD CONSTRAINT "payment_verification_queue_retailer_id_fkey" FOREIGN KEY ("retailer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
