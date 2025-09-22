-- AlterTable
ALTER TABLE "public"."cms_banners" ADD COLUMN     "secondary_cta_link" TEXT,
ADD COLUMN     "secondary_cta_text" TEXT;

-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "payment_amount" DECIMAL(10,2),
ADD COLUMN     "payment_method" TEXT,
ADD COLUMN     "payment_reference" TEXT,
ADD COLUMN     "payment_status" TEXT,
ALTER COLUMN "currency" SET DEFAULT 'KES';

-- AlterTable
ALTER TABLE "public"."profiles" ADD COLUMN     "paystack_account_number" TEXT,
ADD COLUMN     "paystack_business_name" TEXT,
ADD COLUMN     "paystack_commission_rate" DOUBLE PRECISION,
ADD COLUMN     "paystack_primary_contact_email" TEXT,
ADD COLUMN     "paystack_primary_contact_name" TEXT,
ADD COLUMN     "paystack_primary_contact_phone" TEXT,
ADD COLUMN     "paystack_settlement_bank" TEXT,
ADD COLUMN     "paystack_subaccount_created_at" TIMESTAMP(3),
ADD COLUMN     "paystack_subaccount_status" TEXT,
ADD COLUMN     "paystack_subaccount_updated_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."onboarding_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "admin_id" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "old_status" "public"."onboarding_status",
    "new_status" "public"."onboarding_status",
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cms_partner_sections" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "background_image" TEXT,
    "cta1_text" TEXT,
    "cta1_link" TEXT,
    "cta2_text" TEXT,
    "cta2_link" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_partner_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."paystack_splits" (
    "id" TEXT NOT NULL,
    "split_code" TEXT NOT NULL,
    "subaccount_id" TEXT NOT NULL,
    "commission_rate" DECIMAL(5,4) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paystack_splits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "paystack_splits_split_code_key" ON "public"."paystack_splits"("split_code");

-- AddForeignKey
ALTER TABLE "public"."onboarding_history" ADD CONSTRAINT "onboarding_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."onboarding_history" ADD CONSTRAINT "onboarding_history_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
