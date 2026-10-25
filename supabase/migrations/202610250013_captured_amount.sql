BEGIN;
ALTER TABLE orders ADD COLUMN captured_paise bigint CHECK(captured_paise>=0);
ALTER TABLE orders ADD COLUMN captured_currency text;
UPDATE orders SET captured_paise=total_paise,captured_currency='INR' WHERE payment_status IN ('captured','partially_refunded','refunded');
INSERT INTO schema_migrations(version) VALUES('202610250013_captured_amount') ON CONFLICT DO NOTHING;
COMMIT;
