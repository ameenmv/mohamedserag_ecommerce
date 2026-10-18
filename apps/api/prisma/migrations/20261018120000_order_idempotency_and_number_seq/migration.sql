-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "idempotency_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");


-- Order numbers (SR-<year>-<6 digits>) come from this sequence. Starts above the seeded
-- demo orders (SR-2026-0001xx) so numbers never collide.
CREATE SEQUENCE IF NOT EXISTS "order_no_seq" START WITH 1001;
