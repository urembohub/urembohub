-- AlterTable
ALTER TABLE "public"."live_shopping_sessions" ADD COLUMN     "agora_channel_name" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "language" TEXT DEFAULT 'en',
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "scheduled_end" TIMESTAMP(3),
ADD COLUMN     "scheduled_start" TIMESTAMP(3),
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "timezone" TEXT DEFAULT 'UTC';
