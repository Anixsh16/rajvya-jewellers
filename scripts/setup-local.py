"""Seed an isolated Supabase CLI stack without changing cloud configuration."""
import json,pathlib,subprocess,os,shutil,sys,urllib.parse
root=pathlib.Path(__file__).resolve().parents[1];local=root/'.local';local.mkdir(exist_ok=True)
npx=shutil.which('npx.cmd' if os.name=='nt' else 'npx')
status=subprocess.run([npx,'supabase','status','--output','json'],cwd=root,capture_output=True,text=True,encoding='utf-8',check=True)
data=json.loads(status.stdout)
if urllib.parse.urlparse(data['DB_URL']).hostname not in ('127.0.0.1','localhost','::1'):raise SystemExit('Refusing a non-local database')
cfg={'NEXT_PUBLIC_SUPABASE_URL':data['API_URL'],'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY':data.get('PUBLISHABLE_KEY') or data['ANON_KEY'],'SUPABASE_SECRET_KEY':data.get('SECRET_KEY') or data['SERVICE_ROLE_KEY'],'DATABASE_URL':data['DB_URL'],'DATABASE_SSL':'disable','GEMINI_API_KEY':'local-offline-fixture','GEMINI_MODEL':'gemini-3.5-flash-lite','EMBEDDING_MODEL':'gemini-embedding-2','RAZORPAY_KEY_ID':'rzp_test_offline_fixture','RAZORPAY_KEY_SECRET':'local-offline-fixture','RAZORPAY_WEBHOOK_SECRET':'local-webhook-fixture-not-for-cloud','CRON_SECRET':'local-cron-fixture-not-for-cloud','NEXT_PUBLIC_SITE_URL':'http://localhost:3001','RAJVYA_LOCAL_PREVIEW':'1','OWNER_EMAIL':'owner@local.rajvya.example','OWNER_PASSWORD':'local-demo-owner-password','STAFF_EMAIL':'staff@local.rajvya.example','STAFF_PASSWORD':'local-demo-staff-password','DEMO_CUSTOMER_EMAIL':'customer@local.rajvya.example','DEMO_CUSTOMER_PASSWORD':'local-demo-customer-password'}
path=local/'local-credentials.json';path.write_text(json.dumps(cfg,indent=2),encoding='utf-8')
env={**os.environ,**cfg,'RAJVYA_CREDENTIALS_FILE':str(path),'RAJVYA_ACCOUNTS_FILE':str(local/'local-demo-accounts.json')}
subprocess.run([sys.executable,'scripts/seed.py'],cwd=root,env=env,check=True)
env_text='\n'.join(k+'='+v for k,v in cfg.items())+'\n'
env_text+='E2E_BASE_URL=http://localhost:3001\nRAJVYA_ACCOUNTS_FILE=.local/local-demo-accounts.json\n'
(local/'local.env').write_text(env_text,encoding='utf-8')
if '--github-env' in sys.argv:
    with open(os.environ['GITHUB_ENV'],'a',encoding='utf-8') as f:f.write(env_text)
print('Local Supabase seeded. Local configuration and accounts saved under .local; cloud settings unchanged.')
