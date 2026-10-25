BEGIN;
CREATE OR REPLACE FUNCTION public.expire_holds() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE h record; n integer:=0; o orders; order_ids uuid[]; product_ids uuid[];
BEGIN
 SELECT coalesce(array_agg(DISTINCT order_id ORDER BY order_id),'{}'::uuid[]) INTO order_ids FROM holds WHERE expires_at<=now();
 -- Acquire every order lock before any product lock. A late payment can need a
 -- product currently held by another expired order in this same batch.
 PERFORM id FROM orders WHERE id=ANY(order_ids) ORDER BY id FOR UPDATE;
 SELECT coalesce(array_agg(product_id ORDER BY product_id),'{}'::uuid[]) INTO product_ids FROM holds WHERE order_id=ANY(order_ids) AND expires_at<=now();
 PERFORM id FROM products WHERE id=ANY(product_ids) ORDER BY id FOR UPDATE;
 FOR h IN SELECT * FROM holds WHERE order_id=ANY(order_ids) AND product_id=ANY(product_ids) AND expires_at<=now() ORDER BY order_id,product_id LOOP
  SELECT * INTO o FROM orders WHERE id=h.order_id;
  DELETE FROM holds WHERE product_id=h.product_id AND order_id=h.order_id AND expires_at<=now();
  IF FOUND THEN
   UPDATE products SET status='live',updated_at=now() WHERE id=h.product_id AND status IN ('held','reserved'); n:=n+1;
   IF o.type='reservation' AND o.payment_status='captured' AND o.fulfillment_status IN ('created','ready') THEN
    UPDATE orders SET fulfillment_status='cancelled' WHERE id=o.id;
    INSERT INTO refunds(order_id,customer_id,reason,amount_paise) VALUES(o.id,o.customer_id,'Reservation expired — review token refund',o.total_paise) ON CONFLICT DO NOTHING;
   END IF;
  END IF;
 END LOOP; RETURN n;
END $$;
INSERT INTO schema_migrations(version) VALUES('202610250012_expiry_lock_order') ON CONFLICT DO NOTHING;
COMMIT;
