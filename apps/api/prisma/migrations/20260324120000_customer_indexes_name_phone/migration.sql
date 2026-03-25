-- Improve list/search performance for customer name and phone lookups.
CREATE INDEX IF NOT EXISTS "Customer_name_idx" ON "Customer" ("name");
CREATE INDEX IF NOT EXISTS "Customer_phone_idx" ON "Customer" ("phone");
