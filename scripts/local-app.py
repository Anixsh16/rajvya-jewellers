"""Run an isolated local preview on port 3001 with its own Next build output."""
import json,pathlib,os,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[1]
cfg=json.loads((root/'.local/local-credentials.json').read_text(encoding='utf-8'))
node=root/'node_modules/node/bin'/('node.exe' if os.name=='nt' else 'node')
raise SystemExit(subprocess.call([str(node),'node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3001'],cwd=root,env={**os.environ,**cfg}))
