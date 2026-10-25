from db_connection import connect_database
"""Apply tracked migrations once. Credentials are read locally, never printed."""
import pathlib,json,os,psycopg,urllib.parse
root=pathlib.Path(__file__).resolve().parents[1]
cfgpath=pathlib.Path(os.environ.get('RAJVYA_CREDENTIALS_FILE',pathlib.Path.home()/'.config'/'rajvya'/'credentials.json'))
cfg=json.loads(cfgpath.read_text()) if cfgpath.exists() else os.environ
database_url=os.environ.get('DATABASE_URL') or cfg['DATABASE_URL']
local=urllib.parse.urlparse(database_url).hostname in ('localhost','127.0.0.1','::1')
sslmode='disable' if local and os.environ.get('DATABASE_SSL')=='disable' else 'require'
with connect_database(database_url,connect_timeout=15,autocommit=True) as db:
    for file in sorted((root/'supabase'/'migrations').glob('*.sql')):
        exists=db.execute("select to_regclass('public.schema_migrations')").fetchone()[0]
        if exists and db.execute('select 1 from public.schema_migrations where version=%s',(file.stem,)).fetchone():
            print('Already applied:',file.stem);continue
        db.execute(file.read_text(encoding='utf-8'))
        print('Applied:',file.stem)
