BEGIN;
UPDATE policies SET content='Demo metal value is net metal weight multiplied by the owner-confirmed daily rate for its purity. Each piece then uses either its configured percentage of metal value or its fixed making charge; a fixed charge overrides the percentage. Stone charges are added, followed by the illustrative 3% tax on the subtotal. Product pages and quote breakdowns show the exact charges. Quotes remain valid for 15 minutes and cannot be edited. A fresh quote requires customer confirmation. These are fictional demo rules, not investment advice.',updated_at=now()
WHERE title='Pricing and quotes' AND content='Demo prices use net metal weight, the owner-confirmed daily rate, making charges, stone charges and a sample 3% tax. Quotes remain valid for 15 minutes. A new price requires your confirmation. Prices are not investment advice.';
INSERT INTO schema_migrations(version) VALUES('202610250009_policy_detail') ON CONFLICT DO NOTHING;
COMMIT;
