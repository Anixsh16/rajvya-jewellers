BEGIN;
ALTER TABLE messages ADD COLUMN link text;
ALTER TABLE messages ADD COLUMN link_label text;
INSERT INTO schema_migrations(version) VALUES('202610240005_conversation_actions') ON CONFLICT DO NOTHING;
COMMIT;
