"""Configure and deploy the demo using HTTPS APIs. No credentials in command arguments."""
import pathlib,json,urllib.request,urllib.error,hashlib,concurrent.futures,sys,time
root=pathlib.Path(__file__).resolve().parents[1]
config=json.loads((pathlib.Path.home()/'.config'/'rajvya'/'credentials.json').read_text())
project=json.loads((root/'.local'/'vercel-project.json').read_text())
team=project['teamId'];pid=project['projectId'];base='https://api.vercel.com'
def request(path,body=None,method=None,extra=None,binary=False):
    h={'Authorization':'Bearer '+config['VERCEL_TOKEN'],'Content-Type':'application/json',**(extra or {})}
    payload=body if binary else json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(urllib.request.Request(base+path,data=payload,headers=h,method=method or ('POST' if body is not None else 'GET')),timeout=180) as r:
            data=r.read();return json.loads(data) if data else {}
    except urllib.error.HTTPError as e:
        d=json.load(e);err=d.get('error',{});raise RuntimeError(str(e.code)+' '+str(err.get('code'))+' '+str(err.get('message',''))[:300]) from None
def configure():
    request('/v9/projects/'+pid+'?teamId='+team,{'nodeVersion':'22.x','installCommand':'npm ci --legacy-peer-deps','buildCommand':'npm run build'},'PATCH')
    exclude={'VERCEL_TOKEN','GITHUB_TOKEN','SUPABASE_ACCESS_TOKEN','SUPABASE_PROJECT_REF','OWNER_PASSWORD','STAFF_PASSWORD','DEMO_CUSTOMER_PASSWORD','OWNER_EMAIL','STAFF_EMAIL','DEMO_CUSTOMER_EMAIL','MCP_TOKEN'}
    env=[{'key':k,'value':v,'type':'encrypted','target':['production','preview']} for k,v in config.items() if k not in exclude and k!='NEXT_PUBLIC_SITE_URL']
    env.append({'key':'NEXT_PUBLIC_SITE_URL','value':'https://rajvya-jewellers.vercel.app','type':'plain','target':['production','preview']})
    request('/v10/projects/'+pid+'/env?teamId='+team+'&upsert=true',env)
    print('Vercel runtime configured; values hidden.',flush=True)
def deploy():
    ignored={'node_modules','.next','.git','.local','.vercel','test-results','playwright-report','coverage','__pycache__'}
    files=[]
    for file in root.rglob('*'):
        rel=file.relative_to(root)
        if not file.is_file() or any(p in ignored for p in rel.parts) or file.name.startswith('.env') or file.suffix in ('.log','.tsbuildinfo'):continue
        data=file.read_bytes();sha=hashlib.sha1(data).hexdigest();files.append(({'file':rel.as_posix(),'sha':sha,'size':len(data)},data))
    def upload(f):
        info,data=f
        for attempt in range(3):
            try:request('/v2/files?teamId='+team,data,extra={'Content-Type':'application/octet-stream','x-vercel-digest':info['sha'],'x-vercel-size':str(len(data))},binary=True);return info
            except Exception:
                if attempt==2:raise
                time.sleep(2)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:uploaded=list(pool.map(upload,files))
    d=request('/v13/deployments?teamId='+team,{'name':project['name'],'project':pid,'target':'production','files':uploaded,'projectSettings':{'framework':'nextjs','installCommand':'npm ci --legacy-peer-deps','buildCommand':'npm run build','nodeVersion':'22.x'}})
    (root/'.local'/'deployment.json').write_text(json.dumps(d))
    print('Deployment submitted:',d.get('id'),d.get('url'),flush=True)
def status():
    deployment=json.loads((root/'.local'/'deployment.json').read_text())
    d=request('/v13/deployments/'+deployment['id']+'?teamId='+team)
    print(json.dumps({k:d.get(k) for k in ['id','readyState','url','alias','errorCode','errorMessage']}),flush=True)
if __name__=='__main__':
    action=sys.argv[1] if len(sys.argv)>1 else 'status'
    try:{'configure':configure,'deploy':deploy,'status':status}[action]()
    except Exception as e:print('Deployment operation failed:',str(e),file=sys.stderr);sys.exit(1)
