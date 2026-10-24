BEGIN;
ALTER TABLE products ADD COLUMN internal_only boolean NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN internal_only boolean NOT NULL DEFAULT false;
DROP VIEW catalogue;
CREATE VIEW catalogue WITH (security_invoker=true) AS
 SELECT p.*,r.rate_paise,CASE WHEN r.rate_paise IS NOT NULL THEN public.calculate_price(p,r.rate_paise) ELSE NULL END AS price,
 CASE WHEN p.status IN ('held','reserved') AND NOT EXISTS(SELECT 1 FROM public.holds h WHERE h.product_id=p.id AND h.expires_at>now()) THEN 'live' ELSE p.status END AS availability
 FROM public.products p LEFT JOIN LATERAL(SELECT rate_paise FROM public.metal_rates mr WHERE mr.purity=p.purity AND mr.rate_date=(now() AT TIME ZONE 'Asia/Kolkata')::date ORDER BY mr.created_at DESC LIMIT 1) r ON true WHERE NOT p.internal_only;
DROP POLICY public_products ON products;
CREATE POLICY public_products ON products FOR SELECT USING((status<>'draft' AND NOT internal_only) OR is_staff());
INSERT INTO schema_migrations(version) VALUES('202610240003_internal_fixtures') ON CONFLICT DO NOTHING;
COMMIT;
