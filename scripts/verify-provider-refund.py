from db_connection import connect_database
"""Approve only the explicitly recorded, low-value Razorpay TEST checkout."""
import pathlib,json,urllib.request,http.cookiejar,psycopg,base64,sys
if '--approve-recorded-test-refund' not in sys.argv:raise SystemExit('Explicit --approve-recorded-test-refund flag required')
root=pathlib.Path(__file__).resolve().parents[1]
c=json.loads((pathlib.Path.home()/'.config/rajvya/credentials.json').read_text(encoding='utf-8'))
e=json.loads((root/'.local/refund-checkpoint-evidence.json').read_text(encoding='utf-8'))
assert c['RAZORPAY_KEY_ID'].startswith('rzp_test_') and e['waitingAfterFreshProcess'] and not e['hasOwnerDecision']
with connect_database(c['DATABASE_URL'],connect_timeout=20) as db:
    r=db.execute('select r.status,r.amount_paise,o.provider_payment_id,o.internal_only from refunds r join orders o on o.id=r.order_id where r.id=%s',(e['requestId'],)).fetchone()
    assert r and r[0]=='pending' and 0<int(r[1])<=300000 and not r[3]
opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(path,body):
    req=urllib.request.Request('http://localhost:3000/api/'+path,data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})
    with opener.open(req,timeout=180) as response:return json.load(response)
call('auth/login',{'email':c['OWNER_EMAIL'],'password':c['OWNER_PASSWORD']})
call('admin/refunds',{'refundId':e['requestId'],'approve':True})
with connect_database(c['DATABASE_URL'],connect_timeout=20) as db:
    saved=db.execute('select status,provider_refund_id from refunds where id=%s',(e['requestId'],)).fetchone()
    assert saved[1], 'No provider refund identity'
token=base64.b64encode((c['RAZORPAY_KEY_ID']+':'+c['RAZORPAY_KEY_SECRET']).encode()).decode()
req=urllib.request.Request('https://api.razorpay.com/v1/refunds/'+saved[1],headers={'Authorization':'Basic '+token})
with urllib.request.urlopen(req,timeout=30) as response:provider=json.load(response)
assert provider['payment_id']==r[2] and provider['amount']==int(r[1])
e.update({'ownerApproved':True,'databaseStatus':saved[0],'providerStatus':provider['status'],'providerAmountMatches':True})
(root/'.local/provider-refund-evidence.json').write_text(json.dumps(e,indent=2),encoding='utf-8')
print(json.dumps({'ownerApproved':True,'databaseStatus':saved[0],'providerStatus':provider['status'],'providerAmountMatches':True}))
