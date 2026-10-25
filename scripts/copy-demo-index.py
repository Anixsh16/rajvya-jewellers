from db_connection import connect_database
"""Reuse already-verified sample embeddings in the disposable local database."""
import pathlib,json,psycopg,urllib.parse
root=pathlib.Path(__file__).resolve().parents[1]
source=json.loads((pathlib.Path.home()/'.config/rajvya/credentials.json').read_text(encoding='utf-8'))
target=json.loads((root/'.local/local-credentials.json').read_text(encoding='utf-8'))
if urllib.parse.urlparse(target['DATABASE_URL']).hostname not in ('localhost','127.0.0.1','::1'):raise SystemExit('Target must be local')
with connect_database(source['DATABASE_URL'],connect_timeout=20) as db:
    rows=db.execute("select sku,text_embedding::text,image_embedding::text,embedding_model,embedding_revision from products where not internal_only and sku like 'RJ-%%' and embedding_status='ready'").fetchall()
with psycopg.connect(target['DATABASE_URL'],sslmode='disable',connect_timeout=10) as db:
    for sku,text,image,model,revision in rows:db.execute("update products set text_embedding=%s::vector,image_embedding=%s::vector,embedding_model=%s,embedding_revision=%s,embedding_status='ready' where sku=%s",(text,image,model,revision,sku))
print('Reused',len(rows),'sample catalogue embeddings locally. No customer, order, or credential data copied.')
