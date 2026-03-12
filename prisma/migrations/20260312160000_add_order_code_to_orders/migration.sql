ALTER TABLE "orders" ADD COLUMN "order_code" TEXT;
ALTER TABLE "manufacturer_orders" ADD COLUMN "order_code" TEXT;

CREATE UNIQUE INDEX "orders_order_code_key" ON "orders"("order_code");
CREATE UNIQUE INDEX "manufacturer_orders_order_code_key" ON "manufacturer_orders"("order_code");
