"""Commit and push without storing a token in the remote or Git configuration."""
import pathlib,json,os,subprocess,base64
root=pathlib.Path(__file__).resolve().parents[1]
cfg=json.loads((pathlib.Path.home()/'.config'/'rajvya'/'credentials.json').read_text())
def git(*args,auth=False):
    env=os.environ.copy()
    if auth:
        env['GIT_CONFIG_COUNT']='1';env['GIT_CONFIG_KEY_0']='http.https://github.com/.extraheader';env['GIT_CONFIG_VALUE_0']='AUTHORIZATION: basic '+base64.b64encode(('x-access-token:'+cfg['GITHUB_TOKEN']).encode()).decode()
    return subprocess.run(['git',*args],cwd=root,env=env,check=True,capture_output=True,text=True)
if not (root/'.git').exists():
    git('init','-b','main');git('config','user.name','Anish');git('config','user.email','Anixsh16@users.noreply.github.com');git('remote','add','origin','https://github.com/Anixsh16/rajvya-jewellers.git')
git('add','.')
files=git('diff','--cached','--name-only').stdout.splitlines()
secrets=[v for k,v in cfg.items() if any(w in k for w in ['SECRET','TOKEN','PASSWORD','API_KEY','DATABASE_URL']) and len(v)>15]
for f in files:
    path=root/f
    if path.exists() and path.suffix not in ['.png','.jpg','.webp','.zip']:
        text=path.read_text(encoding='utf-8',errors='ignore')
        if any(secret in text for secret in secrets):raise RuntimeError('Secret scan blocked a staged file; values withheld')
if files:
    git('commit','-m','Build Rajvya jewellery storefront and commerce platform')
    print('Committed',len(files),'files. Secret scan passed.')
try:
    result=git('push','-u','origin','main',auth=True);print('Pushed main to the requested repository.')
except subprocess.CalledProcessError as e:
    # Tokens are passed only via inherited environment, never echoed.
    print('Git push failed:',e.stderr[:900]);raise SystemExit(1)
