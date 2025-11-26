-- AlterTable
ALTER TABLE "public"."service_escrows" ADD COLUMN     "completion_code" TEXT,
ADD COLUMN     "completion_code_expires_at" TIMESTAMP(3);
