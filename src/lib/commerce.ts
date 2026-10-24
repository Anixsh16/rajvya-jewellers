import {db,plain} from './db';
import {AppError} from './auth';
import {razor,signatureOK} from './payments';
import type {Actor} from './types';
import {randomBytes} from 'node:crypto';
export async function getQuote(a:Actor,ids:string[]){const [{id}]=await db()`select make_quote(${a.id}::uuid,${db().array(ids)}::uuid[]) as id`;return quote(a,id);}
export async function quote(a:Actor,id:string):Promise<{id:string;total_paise:string;expires_at:string;items:any[];[key:string]:any}>{const [q]=await db()`select * from quotes where id=${id} and customer_id=${a.id}`;if(!q)throw new AppError('Quote not found',404);return plain({...q,items:await db()`select * from quote_items where quote_id=${id}`}) as any;}
export async function orders(a:Actor){return plain(await db()`select o.*,coalesce((select jsonb_agg(i.*) from order_items i where i.order_id=o.id),'[]') as items,coalesce((select jsonb_agg(r.*) from refunds r where r.order_id=o.id),'[]') as refunds from orders o where customer_id=${a.id} order by created_at desc limit 50`);}
export async function order(a:Actor,id:string){const [o]=await db()`select o.*,coalesce((select jsonb_agg(i.*) from order_items i where i.order_id=o.id),'[]') as items from orders o where id=${id} and (customer_id=${a.id} or ${a.role!=='customer'})`;if(!o)throw new AppError('Order not found',404);return plain(o);}
export async function checkout(a:Actor,qid:string,key:string,kind='purchase',visit:string|null=null){
 const [{id}]=await db()`select begin_checkout(${a.id}::uuid,${qid}::uuid,${key},${kind},${visit}::timestamptz) as id`;
 let [o]=await db()`select * from orders where id=${id}`;
 if(o.provider_order_id)return {...plain(o),keyId:process.env.RAZORPAY_KEY_ID};
 // Only the invocation that claims creating may contact the provider. Uncertain attempts require reconciliation.
 const claim=await db()`update orders set provider_state='uncertain' where id=${id} and provider_state='creating' returning id`;
 if(!claim.length)throw new AppError('Checkout is being confirmed. Check your orders before retrying.',409);
 try{
  const rp=await razor<{id:string;amount:number;currency:string}>('orders',{amount:Number(o.total_paise),currency:'INR',receipt:id,notes:{order_id:id,type:kind}});
  [o]=await db()`update orders set provider_order_id=${rp.id},provider_state='ready',updated_at=now() where id=${id} returning *`;
 }catch(e){await db()`update orders set exception_reason='Provider order creation is uncertain; reconciliation required' where id=${id}`;throw e;}
 return {...plain(o),keyId:process.env.RAZORPAY_KEY_ID};
}
export async function callback(a:Actor,id:string,paymentId:string,sig:string){
 const o=await order(a,id);if(!o.provider_order_id||!signatureOK(o.provider_order_id+'|'+paymentId,sig,process.env.RAZORPAY_KEY_SECRET!))throw new AppError('Payment signature is invalid',400);
 // Fetch from the provider; never accept the browser's claim that money was captured.
 const p=await razor<any>('payments/'+encodeURIComponent(paymentId));
 if(p.status==='captured')await paymentCaptured('reconcile:'+p.id,p);
 return order(a,id);
}
export async function paymentCaptured(eventId:string,p:any,payload:any=p){
 if(!p.id||!p.order_id||p.status!=='captured')throw new AppError('Unexpected captured payment',400);
 await db().begin(async(tx:any)=>{
  const seen=await tx`insert into webhook_events(event_id,event_type,payload) values(${eventId},'payment.captured',${tx.json(payload)}) on conflict do nothing returning event_id`;if(!seen.length)return;
  const [o]=await tx`select * from orders where provider_order_id=${p.order_id} for update`;
  if(!o)throw new AppError('Payment order is not yet registered',503);
  if(o.payment_status!=='pending'&&o.payment_status!=='failed')return;
  if(Number(o.total_paise)!==Number(p.amount)||p.currency!=='INR'){
   await tx`update orders set payment_status='exception',provider_payment_id=${p.id},exception_reason='Captured amount or currency does not match the order' where id=${o.id}`;return;
  }
  const items=await tx`select * from order_items where order_id=${o.id} order by product_id`;let available=true;
  for(const i of items){
   const [prod]=await tx`select * from products where id=${i.product_id} for update`;
   const [h]=await tx`select * from holds where product_id=${i.product_id}`;
   if(prod.status==='sold'||prod.status==='draft'||(h&&h.order_id!==o.id&&new Date(h.expires_at)>new Date()))available=false;
  }
  if(!available){await tx`update orders set payment_status='exception',provider_payment_id=${p.id},exception_reason='Payment captured after inventory became unavailable; owner refund review required' where id=${o.id}`;return;}
  const reserve=o.type==='reservation';const expiry=new Date(Date.now()+48*3600000).toISOString();const code='RJ-'+randomBytes(4).toString('hex').toUpperCase();
  for(const i of items){
   await tx`update products set status=${reserve?'reserved':'sold'},updated_at=now() where id=${i.product_id}`;
   if(reserve)await tx`insert into holds(product_id,order_id,expires_at) values(${i.product_id},${o.id},${expiry}) on conflict(product_id) do update set order_id=${o.id},expires_at=${expiry}`;
   else await tx`delete from holds where product_id=${i.product_id}`;
  }
  await tx`update orders set payment_status='captured',provider_payment_id=${p.id},reservation_code=${reserve?code:null},reservation_expires_at=${reserve?expiry:null},updated_at=now(),exception_reason=null where id=${o.id}`;
 });
}
export async function requestRefund(a:Actor,id:string,itemIds:string[],reason:string,conversationId:string|null=null){
 return db().begin(async(tx:any)=>{
  const [o]=await tx`select * from orders where id=${id} and customer_id=${a.id} for update`;
  if(!o||!['captured','partially_refunded','exception'].includes(o.payment_status))throw new AppError('This order is not eligible for a refund request',409);
  const [existing]=await tx`select * from refunds where order_id=${id} and status in ('pending','approved','processing','uncertain')`;if(existing)return plain(existing);
  const items=await tx`select * from order_items where order_id=${id}`;
  const selected=itemIds.length?items.filter((i:any)=>itemIds.includes(i.id)):items;
  if(!selected.length||itemIds.some(i=>!items.some((x:any)=>x.id===i)))throw new AppError('Invalid order items');
  const processed=await tx`select coalesce(sum(amount_paise),0) as total from refunds where order_id=${id} and status='processed'`;
  const remaining=Number(o.total_paise)-Number(processed[0].total);
  const amount=o.type==='reservation'?remaining:Math.min(remaining,selected.reduce((s:number,i:any)=>s+Number(i.total_paise)-Number(i.refunded_paise),0));
  if(amount<=0)throw new AppError('These items have already been refunded',409);
  const [r]=await tx`insert into refunds(order_id,customer_id,reason,amount_paise,item_ids,conversation_id) values(${id},${a.id},${reason},${amount},${tx.array(selected.map((i:any)=>i.id))}::uuid[],${conversationId}) returning *`;
  if(o.type==='purchase')for(const i of selected)await tx`insert into refund_items(refund_id,order_item_id,amount_paise) values(${r.id},${i.id},${Number(i.total_paise)-Number(i.refunded_paise)})`;
  return plain(r);
 });
}
export async function decideRefund(a:Actor,id:string,approve:boolean){
 if(a.role!=='owner')throw new AppError('Owner approval is required',403);
 const [r]=await db()`update refunds set status=${approve?'approved':'rejected'},decision_by=${a.id},decision_at=now() where id=${id} and status='pending' returning *`;
 if(!r){const [existing]=await db()`select * from refunds where id=${id}`;if(!existing)throw new AppError('Refund request not found',404);return plain(existing);}
 await db()`insert into audit_log(actor_id,action,entity_id,detail) values(${a.id},${approve?'refund_approved':'refund_rejected'},${id},${db().json({amountPaise:r.amount_paise})})`;
 return plain(r);
}
export async function executeRefund(id:string){
 const [r]=await db()`update refunds set status='processing' where id=${id} and status='approved' returning *`;
 if(!r)return;
 const [o]=await db()`select * from orders where id=${r.order_id}`;
 if(!o?.provider_payment_id){await db()`update refunds set status='failed' where id=${id}`;throw new AppError('Provider payment is missing',409);}
 try{
  const result=await razor<any>('payments/'+o.provider_payment_id+'/refund',{amount:Number(r.amount_paise),receipt:id,notes:{refund_request_id:id}},{'X-Refund-Idempotency':id});
  await db()`update refunds set provider_refund_id=${result.id} where id=${id}`;
  if(result.status==='processed')await refundProcessed('reconcile:'+result.id,result);
 }catch(e){await db()`update refunds set status='uncertain' where id=${id} and status='processing'`;throw e;}
}
export async function refundProcessed(eventId:string,r:any,payload:any=r){
 await db().begin(async(tx:any)=>{
  const seen=await tx`insert into webhook_events(event_id,event_type,payload) values(${eventId},'refund.processed',${tx.json(payload)}) on conflict do nothing returning event_id`;if(!seen.length)return;
  const [ref]=await tx`select * from refunds where provider_refund_id=${r.id} or id::text=${r.notes?.refund_request_id??''} for update`;if(!ref)throw new AppError('Refund is not yet registered',503);
  if(ref.status==='processed')return;
  if(Number(ref.amount_paise)!==Number(r.amount))throw new AppError('Refund amount mismatch',409);
  const [o]=await tx`select * from orders where id=${ref.order_id} for update`;
  if(!ref.decision_by||r.payment_id!==o.provider_payment_id)throw new AppError('Refund approval or payment mismatch',409);
  await tx`update refunds set status='processed',provider_refund_id=${r.id} where id=${ref.id}`;
  const items=await tx`select * from refund_items where refund_id=${ref.id}`;
  for(const i of items)await tx`update order_items set refunded_paise=refunded_paise+${i.amount_paise} where id=${i.order_item_id}`;
  const [{total}]=await tx`select sum(amount_paise) as total from refunds where order_id=${o.id} and status='processed'`;
  await tx`update orders set payment_status=${Number(total)>=Number(o.total_paise)?'refunded':'partially_refunded'},updated_at=now() where id=${o.id}`;
 });
}
export async function reconcile(a:Actor,id:string){
 const o=await order(a,id);
 if(!o.provider_order_id){
  if(a.role==='customer')throw new AppError('This checkout needs owner reconciliation',409);
  const rp=await razor<any>('orders?count=100');const matches=rp.items.filter((i:any)=>i.receipt===id);
  if(matches.length===1)await db()`update orders set provider_order_id=${matches[0].id},provider_state='ready',exception_reason=null where id=${id}`;
  else throw new AppError('No unique matching provider order in recent results. Manual review required.',409);
 }
 const current=await order(a,id);const rp=await razor<any>('orders/'+current.provider_order_id+'/payments');
 for(const p of rp.items??[])if(p.status==='captured')await paymentCaptured('reconcile:'+p.id,p);
 return order(a,id);
}
