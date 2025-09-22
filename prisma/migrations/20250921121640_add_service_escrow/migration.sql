-- CreateEnum
CREATE TYPE "public"."EscrowStatus" AS ENUM ('pending', 'in_progress', 'completed', 'released', 'disputed', 'refunded', 'expired');

-- CreateEnum
CREATE TYPE "public"."ActionType" AS ENUM ('created', 'service_started', 'service_completed', 'customer_approved', 'customer_disputed', 'admin_released', 'admin_refunded', 'auto_released', 'dispute_resolved');

-- CreateTable
CREATE TABLE "public"."service_escrows" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "status" "public"."EscrowStatus" NOT NULL DEFAULT 'pending',
    "paystack_reference" TEXT,
    "hold_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),
    "auto_release_date" TIMESTAMP(3) NOT NULL,
    "dispute_reason" TEXT,
    "admin_notes" TEXT,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_escrows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."escrow_actions" (
    "id" TEXT NOT NULL,
    "escrow_id" TEXT NOT NULL,
    "action_type" "public"."ActionType" NOT NULL,
    "performed_by" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escrow_actions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."service_escrows" ADD CONSTRAINT "service_escrows_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_escrows" ADD CONSTRAINT "service_escrows_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_escrows" ADD CONSTRAINT "service_escrows_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_escrows" ADD CONSTRAINT "service_escrows_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_escrows" ADD CONSTRAINT "service_escrows_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."escrow_actions" ADD CONSTRAINT "escrow_actions_escrow_id_fkey" FOREIGN KEY ("escrow_id") REFERENCES "public"."service_escrows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."escrow_actions" ADD CONSTRAINT "escrow_actions_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
