"""Run checks against the disposable Supabase stack. Live AI is explicit."""
import json,pathlib,os,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[1]
cfg=json.loads((root/'.local/local-credentials.json').read_text(encoding='utf-8'))
args=sys.argv[1:]
if '--live-ai' in args:
    args.remove('--live-ai')
    private=json.loads((pathlib.Path.home()/'.config/rajvya/credentials.json').read_text(encoding='utf-8'))
    cfg['GEMINI_API_KEY']=private['GEMINI_API_KEY']
if not args or args[0] not in ('test','eval','browser','mcp','judge','smoke'):raise SystemExit('Choose test, eval, browser, mcp, judge or smoke; optionally --live-ai')
commands={'test':['node_modules/vitest/vitest.mjs','run'],'eval':['node_modules/tsx/dist/cli.mjs','scripts/evaluate.ts'],'browser':['node_modules/@playwright/test/cli.js','test'],'mcp':['node_modules/tsx/dist/cli.mjs','scripts/mcp-smoke.ts'],'judge':['node_modules/tsx/dist/cli.mjs','scripts/judge-eval.ts'],'smoke':['node_modules/tsx/dist/cli.mjs','scripts/smoke-conversation.ts']}
node=root/'node_modules/node/bin'/('node.exe' if os.name=='nt' else 'node')
env={**os.environ,**cfg,'E2E_BASE_URL':'http://localhost:3001','RAJVYA_ACCOUNTS_FILE':'.local/local-demo-accounts.json'}
raise SystemExit(subprocess.call([str(node),*commands[args[0]],*args[1:]],cwd=root,env=env))
