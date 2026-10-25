from db_connection import connect_database
"""Exercise authenticated admin APIs with disposable demo fixtures."""
import pathlib,json,urllib.request,urllib.error,http.cookiejar,uuid,psycopg
c=json.loads((pathlib.Path.home()/'.config/rajvya/credentials.json').read_text())
jar=http.cookiejar.CookieJar();opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar));base='http://localhost:3000/api/'
def call(path,body=None,expected=200):
    data=None if body is None else json.dumps(body).encode()
    request=urllib.request.Request(base+path,data=data,headers={'Content-Type':'application/json'})
    try:
        with opener.open(request,timeout=120) as r:status=r.status;result=json.load(r)
    except urllib.error.HTTPError as e:status=e.code;result=json.load(e)
    assert status==expected,path+' returned '+str(status)+': '+str(result.get('error',''))
    print('PASS',path,status,flush=True);return result
call('auth/login',{'email':c['OWNER_EMAIL'],'password':c['OWNER_PASSWORD']})
image=c['NEXT_PUBLIC_SUPABASE_URL']+'/storage/v1/object/public/catalogue/demo/chain.png'
draft=call('admin/extract',{'imageUrl':image});assert 'draft' in draft
sku='QA-'+str(uuid.uuid4());pid=None
product={'sku':sku,'name':'Disposable catalogue review fixture','description':'Illustrative test fixture.','category':'Pendants','purity':'22K','netMg':3200,'grossMg':3350,'makingBps':1200,'stonePaise':0,'imageUrl':image,'publish':False,'reviewConfirmed':False,'huidVerified':False}
try:
    saved=call('admin/products',product);pid=saved['id'];product['id']=pid
    call('admin/products',{**product,'publish':True},400)
    published=call('admin/products',{**product,'publish':True,'reviewConfirmed':True,'huidVerified':True});assert published['status']=='live'
    call('admin/rates',{'purity':'22K','ratePaise':915000,'confirm':True,'override':False})
    call('admin/rates',{'purity':'22K','ratePaise':9150000,'confirm':True,'override':False},409)
    imported=call('admin/import',{'products':[{**product,'id':None}]} if False else {'products':[{k:v for k,v in product.items() if k!='id'}]})
    assert imported['results'][0]['status']=='duplicate'
    print('Catalogue extraction, review gate, publication, duplicate import and rate protection verified.',flush=True)
finally:
    if pid:
        with connect_database(c['DATABASE_URL'],connect_timeout=10) as db:db.execute('delete from products where id=%s and sku=%s',(pid,sku))
