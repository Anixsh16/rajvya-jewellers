"""Schedule reconciliation without putting reusable secrets in pg_net's queue."""
from db_connection import connect_database
import json,pathlib
from psycopg import sql
cfg=json.loads((pathlib.Path.home()/'.config/rajvya/credentials.json').read_text(encoding='utf-8'))
with connect_database(cfg['DATABASE_URL'],connect_timeout=20) as db:
    db.execute('create extension if not exists pg_net with schema extensions')
    # Supabase owns the queue; its grants cannot safely be changed per project.
    # Sign only the exact action, with a fresh nonce and a two-minute expiry.
    for role in ('anon','authenticated'):
        if db.execute("select has_table_privilege(%s,'vault.decrypted_secrets','SELECT')",(role,)).fetchone()[0]:
            raise RuntimeError('Vault is readable by an application role; scheduling refused')
    schema=db.execute("select n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname='hmac' and p.proargtypes='25 25 25'::oidvector limit 1").fetchone()[0]
    for name,value in [('rajvya_site_url','https://rajvya-jewellers.vercel.app'),('rajvya_cron_secret',cfg['CRON_SECRET'])]:
        found=db.execute('select id from vault.secrets where name=%s',(name,)).fetchone()
        if found:db.execute('select vault.update_secret(%s,%s)',(found[0],value))
        else:db.execute('select vault.create_secret(%s,%s)',(value,name))
    command=sql.SQL("""with invocation as (
      select floor(extract(epoch from clock_timestamp()))::bigint::text as ts,gen_random_uuid()::text as nonce
    ) select net.http_post(
      url:=(select decrypted_secret from vault.decrypted_secrets where name='rajvya_site_url')||'/api/cron/reconcile',
      headers:=jsonb_build_object('Content-Type','application/json','x-rajvya-timestamp',ts,'x-rajvya-nonce',nonce,
        'x-rajvya-signature',encode({hmac}(ts||':'||nonce||':/api/cron/reconcile',
          (select decrypted_secret from vault.decrypted_secrets where name='rajvya_cron_secret'),'sha256'),'hex')),
      body:='{{}}'::jsonb,timeout_milliseconds:=240000) from invocation""").format(hmac=sql.Identifier(schema,'hmac')).as_string(db)
    db.execute("select cron.schedule('rajvya-reconcile-payments','*/5 * * * *',%s)",(command,))
print('Reconciliation scheduled every five minutes with nonce-protected short-lived signatures; the signing key stays in Vault.')
