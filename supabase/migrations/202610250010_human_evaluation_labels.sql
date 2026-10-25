BEGIN;
CREATE TABLE eval_human_labels(
 evaluation_id uuid NOT NULL REFERENCES eval_results ON DELETE CASCADE,
 scenario_id text NOT NULL,
 grounded boolean NOT NULL,helpful boolean NOT NULL,warm boolean NOT NULL,
 note text NOT NULL DEFAULT '',reviewed_by uuid NOT NULL REFERENCES auth.users,
 reviewed_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(evaluation_id,scenario_id)
);
ALTER TABLE eval_human_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_labels ON eval_human_labels FOR SELECT USING(is_staff());
GRANT SELECT ON eval_human_labels TO authenticated;
INSERT INTO schema_migrations(version) VALUES('202610250010_human_evaluation_labels') ON CONFLICT DO NOTHING;
COMMIT;
