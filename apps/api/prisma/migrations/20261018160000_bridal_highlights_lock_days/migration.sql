-- AlterTable
ALTER TABLE "bridal_tiers" ADD COLUMN "highlights" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "lock_days" INTEGER;
