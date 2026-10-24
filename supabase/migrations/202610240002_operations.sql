BEGIN;
CREATE SCHEMA IF NOT EXISTS agent;
REVOKE ALL ON SCHEMA agent FROM PUBLIC,anon,authenticated;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
SELECT cron.schedule('rajvya-expire-holds','*/5 * * * *','SELECT public.expire_holds()');
INSERT INTO schema_migrations(version) VALUES('202610240002_operations') ON CONFLICT DO NOTHING;
COMMIT;
