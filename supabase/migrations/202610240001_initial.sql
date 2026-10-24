BEGIN;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS public.schema_migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, name text NOT NULL DEFAULT '', role text NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','staff','owner')), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.metal_rates(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), purity text NOT NULL CHECK(purity IN ('22K','18K','925')), rate_paise bigint NOT NULL CHECK(rate_paise>0), rate_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date, created_by uuid REFERENCES auth.users, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX ON public.metal_rates(purity,rate_date,created_at DESC);
CREATE TABLE public.products(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sku text NOT NULL UNIQUE, name text NOT NULL, description text NOT NULL DEFAULT '', description_hi text NOT NULL DEFAULT '', category text NOT NULL, purity text NOT NULL CHECK(purity IN ('22K','18K','925')), net_mg integer NOT NULL CHECK(net_mg>0), gross_mg integer NOT NULL CHECK(gross_mg>=net_mg), making_bps integer NOT NULL DEFAULT 1200 CHECK(making_bps BETWEEN 0 AND 10000), making_fixed_paise bigint CHECK(making_fixed_paise>=0), stone_paise bigint NOT NULL DEFAULT 0 CHECK(stone_paise>=0), huid text, tags text[] NOT NULL DEFAULT '{}', image_url text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','live','held','reserved','sold')), review_confirmed boolean NOT NULL DEFAULT false, extraction jsonb, embedding_status text NOT NULL DEFAULT 'pending' CHECK(embedding_status IN ('pending','ready','failed')), text_embedding vector(768), image_embedding vector(768), search_document tsvector GENERATED ALWAYS AS (to_tsvector('simple',name || ' ' || description || ' ' || category || ' ' || sku)) STORED, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(status='draft' OR review_confirmed));
CREATE INDEX ON public.products USING gin(search_document);
CREATE INDEX ON public.products(status,purity,category);
CREATE TABLE public.product_images(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES public.products ON DELETE CASCADE, url text NOT NULL, position integer NOT NULL DEFAULT 0);
CREATE TABLE public.quotes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES auth.users, total_paise bigint NOT NULL CHECK(total_paise>0), expires_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.quote_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid NOT NULL REFERENCES public.quotes ON DELETE CASCADE, product_id uuid NOT NULL REFERENCES public.products, snapshot jsonb NOT NULL, total_paise bigint NOT NULL CHECK(total_paise>0), UNIQUE(quote_id,product_id));
CREATE TABLE public.orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES auth.users, quote_id uuid NOT NULL REFERENCES public.quotes, type text NOT NULL CHECK(type IN ('purchase','reservation')), idempotency_key text NOT NULL, total_paise bigint NOT NULL CHECK(total_paise>0), payment_status text NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending','captured','exception','partially_refunded','refunded','failed')), fulfillment_status text NOT NULL DEFAULT 'created' CHECK(fulfillment_status IN ('created','ready','completed','cancelled')), provider_order_id text UNIQUE, provider_payment_id text UNIQUE, provider_state text NOT NULL DEFAULT 'creating' CHECK(provider_state IN ('creating','ready','uncertain','failed')), hold_expires_at timestamptz NOT NULL, reservation_expires_at timestamptz, reservation_code text UNIQUE, visit_at timestamptz, tracking text, exception_reason text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(customer_id,idempotency_key));
CREATE TABLE public.order_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders ON DELETE CASCADE, product_id uuid NOT NULL REFERENCES public.products, snapshot jsonb NOT NULL, total_paise bigint NOT NULL CHECK(total_paise>0), refunded_paise bigint NOT NULL DEFAULT 0 CHECK(refunded_paise>=0 AND refunded_paise<=total_paise), UNIQUE(order_id,product_id));
CREATE TABLE public.holds(product_id uuid PRIMARY KEY REFERENCES public.products, order_id uuid NOT NULL REFERENCES public.orders, expires_at timestamptz NOT NULL);
CREATE INDEX ON public.holds(expires_at);
CREATE TABLE public.refunds(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders, customer_id uuid NOT NULL REFERENCES auth.users, reason text NOT NULL, amount_paise bigint NOT NULL CHECK(amount_paise>0), item_ids uuid[] NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','processing','processed','rejected','uncertain','failed')), decision_by uuid REFERENCES auth.users, decision_at timestamptz, provider_refund_id text UNIQUE, conversation_id uuid, created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX one_active_refund_per_order ON public.refunds(order_id) WHERE status IN ('pending','approved','processing','uncertain');
CREATE TABLE public.refund_items(refund_id uuid NOT NULL REFERENCES public.refunds, order_item_id uuid NOT NULL REFERENCES public.order_items, amount_paise bigint NOT NULL CHECK(amount_paise>0), PRIMARY KEY(refund_id,order_item_id));
CREATE TABLE public.webhook_events(event_id text PRIMARY KEY, event_type text NOT NULL, payload jsonb NOT NULL, processed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.policies(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL UNIQUE, content text NOT NULL, embedding vector(768), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.conversations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES auth.users, needs_human boolean NOT NULL DEFAULT false, summary text, busy_until timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES public.conversations ON DELETE CASCADE, role text NOT NULL CHECK(role IN ('user','assistant','system')), content text NOT NULL, cards jsonb NOT NULL DEFAULT '[]', tool_trace jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX ON public.messages(conversation_id,created_at);
ALTER TABLE public.refunds ADD CONSTRAINT refunds_conversation_fk FOREIGN KEY(conversation_id) REFERENCES public.conversations;
CREATE TABLE public.audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES auth.users, action text NOT NULL, entity_id text, detail jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.search_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), query text NOT NULL, result_count integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.ai_usage(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid REFERENCES auth.users, conversation_id uuid REFERENCES public.conversations, model text NOT NULL, input_tokens integer NOT NULL DEFAULT 0, output_tokens integer NOT NULL DEFAULT 0, duration_ms integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.rate_limits(key text PRIMARY KEY, window_start timestamptz NOT NULL, count integer NOT NULL);
CREATE TABLE public.eval_results(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), commit_sha text NOT NULL, model text NOT NULL, prompt_version text NOT NULL, dataset_version text NOT NULL, mode text NOT NULL, metrics jsonb NOT NULL, results jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());

CREATE OR REPLACE FUNCTION public.calculate_price(p public.products, r bigint) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
 WITH a AS (SELECT round(p.net_mg::numeric*r/1000)::bigint AS metal), b AS (SELECT metal,coalesce(p.making_fixed_paise,round(metal::numeric*p.making_bps/10000)::bigint) AS making FROM a), c AS (SELECT *,metal+making+p.stone_paise AS subtotal FROM b), d AS (SELECT *,round(subtotal::numeric*300/10000)::bigint AS tax FROM c)
 SELECT jsonb_build_object('productId',p.id,'name',p.name,'sku',p.sku,'imageUrl',p.image_url,'purity',p.purity,'netMg',p.net_mg,'ratePaise',r,'metalPaise',metal,'makingPaise',making,'stonePaise',p.stone_paise,'subtotalPaise',subtotal,'taxPaise',tax,'totalPaise',subtotal+tax,'taxBps',300) FROM d
$$;
CREATE OR REPLACE VIEW public.catalogue WITH (security_invoker=true) AS
 SELECT p.*,r.rate_paise,CASE WHEN r.rate_paise IS NOT NULL THEN public.calculate_price(p,r.rate_paise) ELSE NULL END AS price,
 CASE WHEN p.status IN ('held','reserved') AND NOT EXISTS(SELECT 1 FROM public.holds h WHERE h.product_id=p.id AND h.expires_at>now()) THEN 'live' ELSE p.status END AS availability
 FROM public.products p LEFT JOIN LATERAL(SELECT rate_paise FROM public.metal_rates mr WHERE mr.purity=p.purity AND mr.rate_date=(now() AT TIME ZONE 'Asia/Kolkata')::date ORDER BY mr.created_at DESC LIMIT 1) r ON true;

CREATE OR REPLACE FUNCTION public.make_quote(actor uuid, ids uuid[]) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q uuid; pid uuid; p products; r bigint; s jsonb; total bigint:=0; n integer:=0;
BEGIN
 IF cardinality(ids)<1 OR cardinality(ids)>12 OR cardinality(ids)<>(SELECT count(DISTINCT x) FROM unnest(ids) x) THEN RAISE EXCEPTION 'Choose between one and twelve unique pieces'; END IF;
 INSERT INTO quotes(customer_id,total_paise) VALUES(actor,1) RETURNING id INTO q;
 FOREACH pid IN ARRAY ids LOOP
  SELECT * INTO p FROM products WHERE id=pid;
  IF NOT FOUND OR p.status IN ('draft','sold') OR EXISTS(SELECT 1 FROM holds WHERE product_id=pid AND expires_at>now()) THEN RAISE EXCEPTION 'A piece is no longer available'; END IF;
  SELECT rate_paise INTO r FROM metal_rates WHERE purity=p.purity AND rate_date=(now() AT TIME ZONE 'Asia/Kolkata')::date ORDER BY created_at DESC LIMIT 1;
  IF r IS NULL THEN RAISE EXCEPTION 'Today''s shop rate has not been confirmed'; END IF;
  s:=calculate_price(p,r); total:=total+(s->>'totalPaise')::bigint;
  INSERT INTO quote_items(quote_id,product_id,snapshot,total_paise) VALUES(q,pid,s,(s->>'totalPaise')::bigint); n:=n+1;
 END LOOP;
 UPDATE quotes SET total_paise=total WHERE id=q; RETURN q;
END $$;

CREATE OR REPLACE FUNCTION public.begin_checkout(actor uuid,qid uuid,idem text,kind text DEFAULT 'purchase',visit timestamptz DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q quotes; o uuid; item record; p products; expiry timestamptz;
BEGIN
 IF kind NOT IN ('purchase','reservation') OR length(idem)<8 OR length(idem)>128 THEN RAISE EXCEPTION 'Invalid checkout request'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||idem,0));
 SELECT id INTO o FROM orders WHERE customer_id=actor AND idempotency_key=idem;
 IF FOUND THEN RETURN o; END IF;
 SELECT * INTO q FROM quotes WHERE id=qid AND customer_id=actor FOR UPDATE;
 IF NOT FOUND OR q.expires_at<=now() THEN RAISE EXCEPTION 'Quote expired. Please review a fresh price'; END IF;
 IF kind='reservation' AND ((SELECT count(*) FROM quote_items WHERE quote_id=qid)<>1 OR q.total_paise<=2500000 OR visit IS NULL OR visit<=now() OR visit>now()+interval '48 hours') THEN RAISE EXCEPTION 'Reserve one piece above ₹25,000 and choose a visit within 48 hours'; END IF;
 expiry:=least(q.expires_at,now()+interval '15 minutes');
 FOR item IN SELECT * FROM quote_items WHERE quote_id=qid ORDER BY product_id LOOP
  SELECT * INTO p FROM products WHERE id=item.product_id FOR UPDATE;
  IF p.status IN ('draft','sold') OR EXISTS(SELECT 1 FROM holds WHERE product_id=p.id AND expires_at>now()) THEN RAISE EXCEPTION 'One or more pieces are no longer available. Your cart was not held'; END IF;
 END LOOP;
 INSERT INTO orders(customer_id,quote_id,type,idempotency_key,total_paise,hold_expires_at,visit_at) VALUES(actor,qid,kind,idem,CASE WHEN kind='reservation' THEN 100000 ELSE q.total_paise END,expiry,visit) RETURNING id INTO o;
 INSERT INTO order_items(order_id,product_id,snapshot,total_paise) SELECT o,product_id,snapshot,total_paise FROM quote_items WHERE quote_id=qid;
 FOR item IN SELECT * FROM quote_items WHERE quote_id=qid ORDER BY product_id LOOP
  INSERT INTO holds(product_id,order_id,expires_at) VALUES(item.product_id,o,expiry) ON CONFLICT(product_id) DO UPDATE SET order_id=o,expires_at=expiry;
  UPDATE products SET status='held',updated_at=now() WHERE id=item.product_id;
 END LOOP; RETURN o;
END $$;

CREATE OR REPLACE FUNCTION public.expire_holds() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE h record; n integer:=0; o orders;
BEGIN
 FOR h IN SELECT * FROM holds WHERE expires_at<=now() ORDER BY product_id LOOP
  PERFORM 1 FROM products WHERE id=h.product_id FOR UPDATE;
  DELETE FROM holds WHERE product_id=h.product_id AND order_id=h.order_id AND expires_at<=now();
  IF FOUND THEN
   UPDATE products SET status='live',updated_at=now() WHERE id=h.product_id AND status IN ('held','reserved'); n:=n+1;
   SELECT * INTO o FROM orders WHERE id=h.order_id;
   IF o.type='reservation' AND o.payment_status='captured' AND o.fulfillment_status='created' THEN
    UPDATE orders SET fulfillment_status='cancelled' WHERE id=o.id;
    INSERT INTO refunds(order_id,customer_id,reason,amount_paise) VALUES(o.id,o.customer_id,'Reservation expired — review token refund',o.total_paise) ON CONFLICT DO NOTHING;
   END IF;
  END IF;
 END LOOP; RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.allow_request(k text,maximum integer,seconds integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c integer;
BEGIN
 INSERT INTO rate_limits(key,window_start,count) VALUES(k,now(),1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.window_start<now()-make_interval(secs=>seconds) THEN 1 ELSE rate_limits.count+1 END,window_start=CASE WHEN rate_limits.window_start<now()-make_interval(secs=>seconds) THEN now() ELSE rate_limits.window_start END RETURNING count INTO c;
 RETURN c<=maximum;
END $$;

CREATE OR REPLACE FUNCTION public.is_staff() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('staff','owner')) $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['profiles','metal_rates','products','product_images','quotes','quote_items','orders','order_items','holds','refunds','refund_items','webhook_events','policies','conversations','messages','audit_log','search_events','ai_usage','rate_limits','eval_results','schema_migrations'] LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t); END LOOP;
END $$;
CREATE POLICY public_products ON products FOR SELECT USING(status<>'draft' OR is_staff());
CREATE POLICY public_rates ON metal_rates FOR SELECT USING(true);
CREATE POLICY public_images ON product_images FOR SELECT USING(EXISTS(SELECT 1 FROM products WHERE id=product_id AND status<>'draft') OR is_staff());
CREATE POLICY public_policies ON policies FOR SELECT USING(true);
CREATE POLICY own_profile ON profiles FOR SELECT USING(id=auth.uid() OR is_staff());
CREATE POLICY own_quotes ON quotes FOR SELECT USING(customer_id=auth.uid() OR is_staff());
CREATE POLICY own_quote_items ON quote_items FOR SELECT USING(EXISTS(SELECT 1 FROM quotes WHERE id=quote_id AND customer_id=auth.uid()) OR is_staff());
CREATE POLICY own_orders ON orders FOR SELECT USING(customer_id=auth.uid() OR is_staff());
CREATE POLICY own_order_items ON order_items FOR SELECT USING(EXISTS(SELECT 1 FROM orders WHERE id=order_id AND customer_id=auth.uid()) OR is_staff());
CREATE POLICY own_refunds ON refunds FOR SELECT USING(customer_id=auth.uid() OR is_staff());
CREATE POLICY own_conversations ON conversations FOR SELECT USING(customer_id=auth.uid() OR is_staff());
CREATE POLICY own_messages ON messages FOR SELECT USING(EXISTS(SELECT 1 FROM conversations WHERE id=conversation_id AND customer_id=auth.uid()) OR is_staff());
CREATE POLICY staff_audit ON audit_log FOR SELECT USING(is_staff());
CREATE POLICY staff_eval ON eval_results FOR SELECT USING(is_staff());
-- Availability is served by the backend; customers do not read other customers' holds.
GRANT SELECT ON products,product_images,metal_rates,policies TO anon,authenticated;
GRANT SELECT ON profiles,quotes,quote_items,orders,order_items,refunds,conversations,messages,audit_log,eval_results TO authenticated;
REVOKE ALL ON FUNCTION public.make_quote(uuid,uuid[]) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.begin_checkout(uuid,uuid,text,text,timestamptz) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.expire_holds() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.allow_request(text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.make_quote(uuid,uuid[]),public.begin_checkout(uuid,uuid,text,text,timestamptz),public.expire_holds(),public.allow_request(text,integer,integer) TO service_role;
INSERT INTO schema_migrations(version) VALUES('202610240001_initial') ON CONFLICT DO NOTHING;
COMMIT;
