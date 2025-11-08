-- AlterTable
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_due_at_door" BOOLEAN NOT NULL DEFAULT false;


