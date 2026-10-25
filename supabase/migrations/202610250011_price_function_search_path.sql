BEGIN;
ALTER FUNCTION public.calculate_price(public.products,bigint) SET search_path=pg_catalog,public;
INSERT INTO schema_migrations(version) VALUES('202610250011_price_function_search_path') ON CONFLICT DO NOTHING;
COMMIT;
