"""Configure only the repository's deployment/evaluation secrets; never echo values."""
import json,pathlib,urllib.request,base64
from nacl.public import PublicKey,SealedBox
root=pathlib.Path(__file__).resolve().parents[1]
cfg=json.loads((pathlib.Path.home()/'.config/rajvya/credentials.json').read_text(encoding='utf-8'))
project=json.loads((root/'.local/vercel-project.json').read_text(encoding='utf-8'))
base='https://api.github.com/repos/Anixsh16/rajvya-jewellers'
def request(path,body=None,method=None):
    data=json.dumps(body).encode() if body is not None else None
    req=urllib.request.Request(base+path,data=data,method=method,headers={'Authorization':'Bearer '+cfg['GITHUB_TOKEN'],'Accept':'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'})
    with urllib.request.urlopen(req,timeout=30) as response:
        text=response.read();return json.loads(text) if text else {}
key=request('/actions/secrets/public-key');box=SealedBox(PublicKey(base64.b64decode(key['key'])))
values={'GEMINI_API_KEY':cfg['GEMINI_API_KEY'],'VERCEL_TOKEN':cfg['VERCEL_TOKEN'],'VERCEL_PROJECT_ID':project['projectId'],'VERCEL_TEAM_ID':project['teamId']}
for name,value in values.items():
    request('/actions/secrets/'+name,{'encrypted_value':base64.b64encode(box.encrypt(value.encode())).decode(),'key_id':key['key_id']},'PUT')
print('GitHub repository deployment/evaluation configuration saved. Secret values encrypted and hidden.')
