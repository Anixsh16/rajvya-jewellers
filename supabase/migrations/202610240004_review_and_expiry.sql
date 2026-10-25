BEGIN;
ALTER TABLE messages ADD COLUMN publication text NOT NULL DEFAULT 'published' CHECK(publication IN ('draft','published'));
ALTER TABLE messages ADD COLUMN reviewed_by uuid REFERENCES auth.users;
ALTER TABLE messages ADD COLUMN reviewed_at timestamptz;
CREATE TABLE public.app_settings(key text PRIMARY KEY,value jsonb NOT NULL);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_staff_read ON app_settings FOR SELECT USING(is_staff());
GRANT SELECT ON app_settings TO authenticated;
INSERT INTO app_settings(key,value) VALUES('assistant_shadow', 'false');
DROP POLICY own_messages ON messages;
CREATE POLICY own_messages ON messages FOR SELECT USING((publication='published' AND EXISTS(SELECT 1 FROM conversations WHERE id=conversation_id AND customer_id=auth.uid())) OR is_staff());
CREATE OR REPLACE FUNCTION public.expire_holds() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE h record; n integer:=0; o orders;
BEGIN
 FOR h IN SELECT * FROM holds WHERE expires_at<=now() ORDER BY order_id,product_id LOOP
  SELECT * INTO o FROM orders WHERE id=h.order_id FOR UPDATE;
  PERFORM 1 FROM products WHERE id=h.product_id FOR UPDATE;
  DELETE FROM holds WHERE product_id=h.product_id AND order_id=h.order_id AND expires_at<=now();
  IF FOUND THEN
   UPDATE products SET status='live',updated_at=now() WHERE id=h.product_id AND status IN ('held','reserved'); n:=n+1;
   IF o.type='reservation' AND o.payment_status='captured' AND o.fulfillment_status='created' THEN
    UPDATE orders SET fulfillment_status='cancelled' WHERE id=o.id;
    INSERT INTO refunds(order_id,customer_id,reason,amount_paise) VALUES(o.id,o.customer_id,'Reservation expired — review token refund',o.total_paise) ON CONFLICT DO NOTHING;
   END IF;
  END IF;
 END LOOP; RETURN n;
END $$;
INSERT INTO schema_migrations(version) VALUES('202610240004_review_and_expiry') ON CONFLICT DO NOTHING;
COMMIT;
