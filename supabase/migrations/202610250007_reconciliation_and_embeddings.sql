BEGIN;
ALTER TABLE orders ADD COLUMN reconciled_at timestamptz;
ALTER TABLE refunds ADD COLUMN reconciled_at timestamptz;
ALTER TABLE products ADD COLUMN embedding_model text NOT NULL DEFAULT 'gemini-embedding-2';
ALTER TABLE products ADD COLUMN embedding_revision integer NOT NULL DEFAULT 1;
CREATE INDEX pending_reconciliation ON orders(reconciled_at NULLS FIRST) WHERE payment_status='pending' AND NOT internal_only;
INSERT INTO schema_migrations(version) VALUES('202610250007_reconciliation_and_embeddings') ON CONFLICT DO NOTHING;
COMMIT;
