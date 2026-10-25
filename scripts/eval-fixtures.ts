import { randomUUID } from 'node:crypto';
import { db } from '../src/lib/db';
import { adminClient } from '../src/lib/supabase';
import { getQuote, paymentCaptured } from '../src/lib/commerce';
import type { Actor } from '../src/lib/types';

export async function evaluationActor(label = 'customer'): Promise<Actor> {
  const email = `evaluation-${label}@rajvya.example`;
  let [user] =
    await db()`select p.id from profiles p join auth.users u on u.id=p.id where u.email=${email}`;
  if (!user) {
    const created = await adminClient().auth.admin.createUser({
      email,
      password: randomUUID() + randomUUID(),
      email_confirm: true,
    });
    if (created.error || !created.data.user)
      throw new Error('Could not provision isolated evaluation identity');
    user = { id: created.data.user.id };
    await db()`insert into profiles(id,name,role) values(${user.id},'Internal evaluation customer','customer')`;
  }
  return { id: user.id, name: 'Internal evaluation customer', role: 'customer' };
}

// Synthetic capture exercises local state transitions only. These orders are hidden
// from commercial dashboards and executeRefund explicitly refuses provider access.
export async function evaluationOrder(actor: Actor) {
  const id = randomUUID();
  await db()`insert into products(id,sku,name,category,purity,net_mg,gross_mg,making_bps,image_url,status,review_confirmed,internal_only) values(${id},${'EVAL-' + id},'Internal evaluation chain','Chains','22K',4200,4200,1200,'/images/chain.png','live',true,true)`;
  const q = await getQuote(actor, [id], { allowInternal: true });
  const [{ order_id }] =
    await db()`select begin_checkout(${actor.id}::uuid,${q.id}::uuid,${'eval-' + randomUUID()},'purchase',null) as order_id`;
  const provider = 'eval_order_' + randomUUID();
  await db()`update orders set internal_only=true,provider_order_id=${provider},provider_state='ready' where id=${order_id}`;
  await paymentCaptured('eval:' + randomUUID(), {
    id: 'eval_payment_' + randomUUID(),
    order_id: provider,
    status: 'captured',
    amount: Number(q.total_paise),
    currency: 'INR',
  });
  return order_id as string;
}
