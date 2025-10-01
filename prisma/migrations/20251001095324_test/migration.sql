/*
  Warnings:

  - You are about to drop the column `agora_channel_name` on the `live_shopping_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `live_shopping_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `language` on the `live_shopping_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `live_shopping_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `scheduled_end` on the `live_shopping_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `scheduled_start` on the `live_shopping_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `live_shopping_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `live_shopping_sessions` table. All the data in the column will be lost.
  - You are about to drop the `escrow_actions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `service_escrows` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."escrow_actions" DROP CONSTRAINT "escrow_actions_escrow_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."escrow_actions" DROP CONSTRAINT "escrow_actions_performed_by_fkey";

-- DropForeignKey
ALTER TABLE "public"."service_escrows" DROP CONSTRAINT "service_escrows_created_by_fkey";

-- DropForeignKey
ALTER TABLE "public"."service_escrows" DROP CONSTRAINT "service_escrows_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."service_escrows" DROP CONSTRAINT "service_escrows_order_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."service_escrows" DROP CONSTRAINT "service_escrows_service_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."service_escrows" DROP CONSTRAINT "service_escrows_vendor_id_fkey";

-- AlterTable
ALTER TABLE "public"."live_shopping_sessions" DROP COLUMN "agora_channel_name",
DROP COLUMN "category",
DROP COLUMN "language",
DROP COLUMN "metadata",
DROP COLUMN "scheduled_end",
DROP COLUMN "scheduled_start",
DROP COLUMN "tags",
DROP COLUMN "timezone";

-- DropTable
DROP TABLE "public"."escrow_actions";

-- DropTable
DROP TABLE "public"."service_escrows";

-- DropEnum
DROP TYPE "public"."ActionType";

-- DropEnum
DROP TYPE "public"."EscrowStatus";
