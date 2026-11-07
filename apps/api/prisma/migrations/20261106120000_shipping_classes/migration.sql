-- Delivery fee by shipping class (024): optional overrides on products and categories.
CREATE TYPE "ShippingClass" AS ENUM ('small', 'medium', 'large');

ALTER TABLE "categories" ADD COLUMN "shipping_class" "ShippingClass";

ALTER TABLE "products" ADD COLUMN "shipping_class" "ShippingClass";
