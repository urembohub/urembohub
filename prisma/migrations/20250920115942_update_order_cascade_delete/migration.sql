-- DropForeignKey
ALTER TABLE "public"."orders" DROP CONSTRAINT "orders_user_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
