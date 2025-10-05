-- AlterTable
ALTER TABLE "public"."product_categories" ADD COLUMN     "show_on_homepage" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."service_categories" ADD COLUMN     "show_on_homepage" BOOLEAN NOT NULL DEFAULT false;
