"""Apply tracked migrations once. Credentials are read locally, never printed."""
import pathlib,json,os,psycopg
root=pathlib.Path(__file__).resolve().parents[1]
cfgpath=pathlib.Path.home()/'.config'/'rajvya'/'credentials.json'
cfg=json.loads(cfgpath.read_text()) if cfgpath.exists() else os.environ
with psycopg.connect(cfg['DATABASE_URL'],sslmode='require',connect_timeout=15,autocommit=True) as db:
    for file in sorted((root/'supabase'/'migrations').glob('*.sql')):
        exists=db.execute("select to_regclass('public.schema_migrations')").fetchone()[0]
        if exists and db.execute('select 1 from public.schema_migrations where version=%s',(file.stem,)).fetchone():
            print('Already applied:',file.stem);continue
        db.execute(file.read_text(encoding='utf-8'))
        print('Applied:',file.stem)
