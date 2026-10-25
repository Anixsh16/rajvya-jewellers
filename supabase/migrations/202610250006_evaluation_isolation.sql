BEGIN;
ALTER TABLE conversations ADD COLUMN internal_only boolean NOT NULL DEFAULT false;
INSERT INTO schema_migrations(version) VALUES('202610250006_evaluation_isolation') ON CONFLICT DO NOTHING;
COMMIT;
