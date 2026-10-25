"""Generate schema types through the official read-only Management API."""
import json,pathlib,urllib.request
root=pathlib.Path(__file__).resolve().parents[1]
cfg=json.loads((pathlib.Path.home()/'.config/rajvya/credentials.json').read_text(encoding='utf-8'))
url='https://api.supabase.com/v1/projects/'+cfg['SUPABASE_PROJECT_REF']+'/types/typescript?included_schemas=public'
with urllib.request.urlopen(urllib.request.Request(url,headers={'Authorization':'Bearer '+cfg['SUPABASE_ACCESS_TOKEN']}),timeout=60) as response:data=json.load(response)
types=data['types'];assert 'export type Database' in types
(root/'src/lib/database.types.ts').write_text('// Generated with scripts/generate-types.py. Do not edit manually.\n'+types,encoding='utf-8')
print('Generated public schema types; no database row data exported.')
