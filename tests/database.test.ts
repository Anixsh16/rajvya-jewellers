import {beforeAll,afterAll,beforeEach,afterEach,describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {db} from '../src/lib/db';
import {getQuote,requestRefund,paymentCaptured,refundProcessed} from '../src/lib/commerce';
import {markSold} from '../src/lib/admin';
import {price} from '../src/lib/pricing';
import type {Actor} from '../src/lib/types';
const enabled=!!process.env.DATABASE_URL;
describe.skipIf(!enabled)('Postgres inventory and payment invariants',()=>{
 let a:Actor,b:Actor;let ids:string[]=[];let events:string[]=[];const sql=db();
 beforeAll(async()=>{const users=await sql`select * from profiles order by role limit 2`;if(users.length<2)throw new Error('Provision two fixture accounts before database tests');a={id:users[0].id,name:'test',role:'customer'};b={id:users[1].id,name:'test',role:'customer'};});
 beforeEach(async()=>{ids=[];events=[];for(let i=0;i<3;i++){const id=randomUUID();ids.push(id);await sql`insert into products(id,sku,name,category,purity,net_mg,gross_mg,making_bps,image_url,status,review_confirmed,internal_only) values(${id},${'TEST-'+id},'Test-only gold piece','Chains','22K',4200,4200,1200,'/images/chain.png','live',true,true)`;}});
 afterEach(async()=>{
  const qs=await sql`select distinct quote_id from quote_items where product_id=any(${sql.array(ids)}::uuid[])`;
  const os=await sql`select distinct order_id from order_items where product_id=any(${sql.array(ids)}::uuid[])`;
  for(const o of os){await sql`delete from refund_items where refund_id in(select id from refunds where order_id=${o.order_id})`;await sql`delete from refunds where order_id=${o.order_id}`;await sql`delete from holds where order_id=${o.order_id}`;await sql`delete from order_items where order_id=${o.order_id}`;await sql`delete from orders where id=${o.order_id}`;}
  for(const q of qs)await sql`delete from quotes where id=${q.quote_id}`;
  await sql`delete from products where id=any(${sql.array(ids)}::uuid[])`;
  if(events.length)await sql`delete from webhook_events where event_id=any(${sql.array(events)}::text[])`;
 });
 afterAll(async()=>{await sql.end();});
 const begin=async(who:Actor,q:any,key=randomUUID())=>{const [{id}]=await sql`select begin_checkout(${who.id}::uuid,${q.id}::uuid,${key},'purchase',null) as id`;return id;};
 async function capturedOrder(){const q=await getQuote(a,[ids[0],ids[1]]);const id=await begin(a,q);const provider='order_test_'+randomUUID();const payment='pay_test_'+randomUUID();await sql`update orders set provider_order_id=${provider},provider_state='ready' where id=${id}`;const p={id:payment,order_id:provider,status:'captured',amount:Number(q.total_paise),currency:'INR'};return {id,q,p};}
 it('uses the same arithmetic in SQL and TypeScript',async()=>{const q=await getQuote(a,[ids[0]]);const s=q.items[0].snapshot;expect(s.totalPaise).toBe(price(4200,s.ratePaise,1200).totalPaise);});
 it('freezes a quote when the product’s making charge changes',async()=>{const q=await getQuote(a,[ids[0]]);await sql`update products set making_bps=2000 where id=${ids[0]}`;const [item]=await sql`select snapshot from quote_items where quote_id=${q.id}`;expect(item.snapshot.totalPaise).toBe(q.items[0].snapshot.totalPaise);});
 it('rejects expired quotes',async()=>{const q=await getQuote(a,[ids[0]]);await sql`update quotes set expires_at=now()-interval '1 second' where id=${q.id}`;await expect(begin(a,q)).rejects.toThrow(/expired/i);});
 it('rejects duplicate product IDs in quotes',async()=>{await expect(getQuote(a,[ids[0],ids[0]])).rejects.toThrow();});
 it('rejects another customer’s quote',async()=>{const q=await getQuote(a,[ids[0]]);await expect(begin(b,q)).rejects.toThrow();});
 it('lets exactly one buyer win overlapping carts',async()=>{const q1=await getQuote(a,[ids[0],ids[1]]),q2=await getQuote(b,[ids[1],ids[2]]);const r=await Promise.allSettled([begin(a,q1),begin(b,q2)]);expect(r.filter(x=>x.status==='fulfilled')).toHaveLength(1);const [{count}]=await sql`select count(*)::int as count from holds where product_id=any(${sql.array(ids)}::uuid[])`;expect(count).toBe(2);});
 it('rolls back every hold when one cart item is unavailable',async()=>{const q=await getQuote(a,[ids[0],ids[1]]);await sql`update products set status='sold' where id=${ids[1]}`;await expect(begin(a,q)).rejects.toThrow();const h=await sql`select * from holds where product_id=${ids[0]}`;expect(h).toHaveLength(0);});
 it('reuses an idempotent checkout',async()=>{const q=await getQuote(a,[ids[0]]);const key=randomUUID();expect(await begin(a,q,key)).toBe(await begin(a,q,key));});
 it('releases expired stock without waiting for the cron sweep',async()=>{const q=await getQuote(a,[ids[0]]);await begin(a,q);await sql`update holds set expires_at=now()-interval '1 second' where product_id=${ids[0]}`;const next=await getQuote(b,[ids[0]]);expect(await begin(b,next)).toBeTruthy();});
 it('prevents counter sale while online checkout holds a piece',async()=>{const q=await getQuote(a,[ids[0]]);await begin(a,q);await expect(markSold({...b,role:'staff'},ids[0],true)).rejects.toThrow(/held/i);});
 it('processes captured payment once even under different event IDs',async()=>{const {id,p}=await capturedOrder();const e1='test:'+randomUUID(),e2='test:'+randomUUID();events.push(e1,e2);await paymentCaptured(e1,p);await paymentCaptured(e1,p);await paymentCaptured(e2,p);const [o]=await sql`select * from orders where id=${id}`;expect(o.payment_status).toBe('captured');const sold=await sql`select * from products where id=any(${sql.array(ids.slice(0,2))}::uuid[]) and status='sold'`;expect(sold).toHaveLength(2);});
 it('queues a captured amount mismatch instead of selling stock',async()=>{const {id,p}=await capturedOrder();const e='test:'+randomUUID();events.push(e);await paymentCaptured(e,{...p,amount:1});const [o]=await sql`select payment_status from orders where id=${id}`;expect(o.payment_status).toBe('exception');});
 it('does not steal stock on a late capture after another sale',async()=>{const {id,p}=await capturedOrder();await sql`update holds set expires_at=now()-interval '1 second' where product_id=any(${sql.array(ids)}::uuid[])`;await sql`update products set status='sold' where id=${ids[0]}`;const e='test:'+randomUUID();events.push(e);await paymentCaptured(e,p);const [o]=await sql`select payment_status from orders where id=${id}`;expect(o.payment_status).toBe('exception');});
 it('rejects refunds requested for another customer’s order',async()=>{const {id,p}=await capturedOrder();const e='test:'+randomUUID();events.push(e);await paymentCaptured(e,p);await expect(requestRefund(b,id,[],'Please refund this purchase')).rejects.toThrow();});
 it('applies an approved item refund once without restocking',async()=>{const {id,p}=await capturedOrder();const e='test:'+randomUUID();events.push(e);await paymentCaptured(e,p);const [item]=await sql`select * from order_items where order_id=${id} order by id`;const r=await requestRefund(a,id,[item.id],'Please refund the selected piece');await sql`update refunds set status='approved',decision_by=${b.id},decision_at=now() where id=${r.id}`;const provider='rfnd_test_'+randomUUID();const refund={id:provider,amount:Number(r.amount_paise),payment_id:p.id,notes:{refund_request_id:r.id}};const re='test:'+randomUUID();events.push(re);await refundProcessed(re,refund);await refundProcessed(re,refund);const [o]=await sql`select payment_status from orders where id=${id}`;expect(o.payment_status).toBe('partially_refunded');const [prod]=await sql`select status from products where id=${item.product_id}`;expect(prod.status).toBe('sold');});
});
