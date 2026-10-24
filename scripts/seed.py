"""Idempotent demo fixtures. Never resets or overwrites sold inventory."""
import pathlib,json,urllib.request,urllib.error,uuid,psycopg
from psycopg.types.json import Jsonb
root=pathlib.Path(__file__).resolve().parents[1]
cfg=json.loads((pathlib.Path.home()/'.config'/'rajvya'/'credentials.json').read_text())
base=cfg['NEXT_PUBLIC_SUPABASE_URL'];headers={'apikey':cfg['SUPABASE_SECRET_KEY'],'Content-Type':'application/json'}
def api(path,method='GET',body=None,extra=None):
    h={**headers,**(extra or {})};data=json.dumps(body).encode() if isinstance(body,(dict,list)) else body
    try:
        with urllib.request.urlopen(urllib.request.Request(base+path,data=data,method=method,headers=h),timeout=180) as r:return json.load(r)
    except urllib.error.HTTPError as e:
        if e.code in (400,409) and '/bucket' in path:return {}
        raise RuntimeError('Supabase operation failed: '+str(e.code)) from None
users=api('/auth/v1/admin/users?page=1&per_page=100').get('users',[])
with psycopg.connect(cfg['DATABASE_URL'],sslmode='require',connect_timeout=15) as db:
    accounts=[]
    for kind,role,name in [('OWNER','owner','Rajvya owner'),('STAFF','staff','Rajvya staff'),('DEMO_CUSTOMER','customer','Demo customer')]:
        email=cfg[kind+'_EMAIL'];u=next((u for u in users if u['email']==email),None)
        if not u:u=api('/auth/v1/admin/users','POST',{'email':email,'password':cfg[kind+'_PASSWORD'],'email_confirm':True,'user_metadata':{'name':name}})
        db.execute('insert into profiles(id,name,role) values(%s,%s,%s) on conflict(id) do nothing',(u['id'],name,role))
        accounts.append({'role':role,'email':email,'password':cfg[kind+'_PASSWORD'],'id':u['id']})
    owner=accounts[0]['id']
    for purity,rate in [('22K',915000),('18K',750000),('925',10000)]:
        db.execute("insert into metal_rates(purity,rate_paise,created_by) select %s,%s,%s where not exists(select 1 from metal_rates where purity=%s and rate_date=(now() at time zone 'Asia/Kolkata')::date)",(purity,rate,owner,purity))
    api('/storage/v1/bucket','POST',{'id':'catalogue','name':'catalogue','public':True,'file_size_limit':8388608,'allowed_mime_types':['image/jpeg','image/png','image/webp']})
    urls={}
    for asset in ['chain','earrings','ring']:
        f=root/'public'/'images'/(asset+'.png');path='demo/'+asset+'.png'
        api('/storage/v1/object/catalogue/'+path,'POST',f.read_bytes(),{'Content-Type':'image/png','x-upsert':'true'})
        urls[asset]=base+'/storage/v1/object/public/catalogue/'+path
    names={'chain':['Everyday gold chain','Petal pendant chain','The heirloom chain','Morning light chain','Classic rope chain','Minimal gold pendant'], 'earrings':['Petite gold studs','Floral gold studs','Everyday petal studs','The occasion studs','Little bloom earrings','Golden hour studs'], 'ring':['Silver everyday ring','The classic silver band','Minimal silver ring','Everyday promise ring','Polished silver band','Quiet silver ring']}
    for i in range(50):
        kind=['chain','earrings','ring'][i%3];n=i//3;purity='925' if kind=='ring' else ('18K' if kind=='earrings' and n%2==0 else '22K')
        weight=(4200+n*180) if kind=='chain' else (2100+n*140 if kind=='earrings' else 6500+n*250)
        if i==0:weight=4200
        name=names[kind][n%6]+(' · '+str(n//6+1) if n>=6 else '')
        cat={'chain':'Chains','earrings':'Earrings','ring':'Rings'}[kind];sku='RJ-'+str(1001+i)
        tags=['daily wear','simple','lightweight','halka','roz','gift','office',cat.lower()]
        desc=f'A {"polished sterling silver" if kind=="ring" else "delicate gold"} {kind if kind!="earrings" else "pair of floral studs"} for everyday moments. Sample catalogue piece with an illustrative AI-generated photograph. Weight and purity are demo fixtures.'
        db.execute("insert into products(sku,name,description,description_hi,category,purity,net_mg,gross_mg,making_bps,making_fixed_paise,image_url,tags,status,review_confirmed) values(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'live',true) on conflict(sku) do nothing",(sku,name,desc,'रोज़ पहनने के लिए सरल आभूषण। यह नमूना उत्पाद है।',cat,purity,weight,weight+150,1200,180000 if kind=='ring' else None,urls[kind],tags))
    policies=[('About this demo','This is an independent portfolio demonstration, not an official commercial shop. All products, rates, policies and visits are illustrative. Razorpay is in test mode; no real money is charged. Jewellery photographs are AI-generated.'),('Pricing and quotes','Demo prices use net metal weight, the owner-confirmed daily rate, making charges, stone charges and a sample 3% tax. Quotes remain valid for 15 minutes. A new price requires your confirmation. Prices are not investment advice.'),('Reservations','One piece priced above ₹25,000 can be reserved with a ₹1,000 test token. A confirmed token payment holds it for 48 hours and freezes the quoted demo price. Choose a visit within 48 hours. The token is credited against the in-store balance. Cancellation or expiry sends a token refund request to the owner.'),('Returns and refunds','For this demo you may request a refund for a purchase or selected order items. Every request requires owner approval. A request is not a promise of eligibility or completed payment. Provider-confirmed refunds update your order. Items are not automatically restocked.'),('Visits and fulfilment','Store visits and fulfilment are simulated. Choose a reservation time and present the reservation code in the owner panel. Online orders can be marked ready or completed by staff. There is no real carrier or store appointment behind this demo.'),('Privacy and support','Use a demo identity and do not submit personal or financial information in chat or product photos. Customers can access only their own orders and conversations. Ask for a human to flag a conversation for owner review.')]
    for title,content in policies:db.execute('insert into policies(title,content) values(%s,%s) on conflict(title) do nothing',(title,content))
    db.commit()
local=root/'.local';local.mkdir(exist_ok=True)
(local/'demo-accounts.json').write_text(json.dumps(accounts,indent=2))
print('Seeded demo accounts, current rates, 50 pieces, photographs, and policies. Account details saved privately in .local/demo-accounts.json.')
