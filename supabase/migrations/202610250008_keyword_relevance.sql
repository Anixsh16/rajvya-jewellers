BEGIN;
ALTER TABLE products ADD COLUMN search_document_v2 tsvector GENERATED ALWAYS AS (
 setweight(to_tsvector('simple',name||' '||sku||' '||category||' '||purity),'A') ||
 setweight(to_tsvector('simple',description||' '||description_hi),'B')
) STORED;
CREATE INDEX products_search_v2 ON products USING gin(search_document_v2);
-- View columns are captured at definition time; include embedding metadata added
-- by the previous migration as well as the new search document.
DROP VIEW catalogue;
CREATE VIEW catalogue WITH (security_invoker=true) AS
 SELECT p.*,r.rate_paise,CASE WHEN r.rate_paise IS NOT NULL THEN public.calculate_price(p,r.rate_paise) ELSE NULL END AS price,
 CASE WHEN p.status IN ('held','reserved') AND NOT EXISTS(SELECT 1 FROM public.holds h WHERE h.product_id=p.id AND h.expires_at>now()) THEN 'live' ELSE p.status END AS availability
 FROM public.products p LEFT JOIN LATERAL(SELECT rate_paise FROM public.metal_rates mr WHERE mr.purity=p.purity AND mr.rate_date=(now() AT TIME ZONE 'Asia/Kolkata')::date ORDER BY mr.created_at DESC LIMIT 1) r ON true WHERE NOT p.internal_only;
INSERT INTO schema_migrations(version) VALUES('202610250008_keyword_relevance') ON CONFLICT DO NOTHING;
COMMIT;
