"""Publish identifiable synthetic evaluation runs to the private owner dashboard."""
import json,pathlib
from psycopg.types.json import Jsonb
from db_connection import connect_database
root=pathlib.Path(__file__).resolve().parents[1]
cfg=json.loads((pathlib.Path.home()/'.config/rajvya/credentials.json').read_text(encoding='utf-8'))
sources=[('release-full-suite.json','live-routed'),('baseline-suite.json','live-single'),('judged-eval.json','live-routed-judged')]
public=[]
with connect_database(cfg['DATABASE_URL'],connect_timeout=20) as db:
    for filename,mode in sources:
        report=json.loads((root/'.local'/filename).read_text(encoding='utf-8'))
        metrics=report['metrics']
        assert metrics['complete'] and metrics['completed']==len(report['results'])
        source_id=report['runId']+':'+mode
        measured={**metrics,'sourceRunId':source_id,'environment':report['environment'],'workingTreeDirty':report['workingTreeDirty'],'resumedFrom':report['resumedFrom'],'scopeNote':'Synthetic fixtures on local Supabase with real Gemini. Not a claim about the final production commit or real customers.'}
        if not db.execute("select 1 from eval_results where metrics->>'sourceRunId'=%s",(source_id,)).fetchone():
            db.execute('insert into eval_results(commit_sha,model,prompt_version,dataset_version,mode,metrics,results) values(%s,%s,%s,%s,%s,%s,%s)',(report['commit'],report['model'],report['promptVersion'],report['dataset'],mode,Jsonb(measured),Jsonb(report['results'])))
        public.append({k:report[k] for k in ('runId','commit','workingTreeDirty','promptVersion','model','dataset','environment','resumedFrom')}|{'mode':mode,'metrics':measured})
    search=json.loads((root/'.local/search-eval.json').read_text(encoding='utf-8'))
    public.append({'mode':'search-comparison','model':'gemini-embedding-2','dimensions':768,'environment':'local-supabase','metrics':search['metrics'],'limitations':'Synthetic category/purity labels; 15 photo cases reuse three catalogue photos. Not an unseen-photo benchmark.'})
(root/'docs/measurements.json').write_text(json.dumps(public,indent=2)+'\n',encoding='utf-8')
print('Published three synthetic evaluation runs to the private dashboard and a redacted aggregate report to docs/measurements.json. No human labels created.')
