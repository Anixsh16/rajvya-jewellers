import { db, plain } from './db';
import { AppError } from './auth';
import type { Actor } from './types';
import { indexProduct } from './ai';
import { productFields } from './catalogue';
const dashboardFields: string[] = [
  ...productFields,
  'extraction',
  'embedding_model',
  'embedding_revision',
  'created_at',
  'updated_at',
];
export async function dashboard() {
  const sql = db();
  const [
    products,
    orders,
    refunds,
    conversations,
    rates,
    searches,
    metrics,
    evals,
    audit,
    settings,
  ] = await Promise.all([
    sql`select ${sql(dashboardFields)} from catalogue order by created_at desc`,
    sql`select o.*,coalesce((select jsonb_agg(i.*) from order_items i where i.order_id=o.id),'[]') as items from orders o where not o.internal_only order by created_at desc limit 100`,
    sql`select r.*,o.provider_payment_id,o.type as order_type from refunds r join orders o on o.id=r.order_id where not o.internal_only order by r.created_at desc limit 100`,
    sql`select c.*,coalesce((select jsonb_agg(m.* order by m.created_at) from messages m where m.conversation_id=c.id),'[]') as messages from conversations c where not c.internal_only order by c.needs_human desc,c.created_at desc limit 30`,
    sql`select * from metal_rates order by created_at desc limit 30`,
    sql`select query,count(*) as searches from search_events where result_count=0 group by query order by searches desc limit 10`,
    sql`select (select count(*) from orders where not internal_only and type='purchase' and payment_status in ('captured','partially_refunded','refunded')) as purchases,(select count(*) from orders where not internal_only and type='reservation' and payment_status in ('captured','partially_refunded','refunded')) as reservations,(select count(*) from orders where not internal_only and type='reservation' and fulfillment_status='completed') as reservation_conversions,(select count(*) from conversations where needs_human and not internal_only) as handoffs,(select count(*) from products where status='live' and not internal_only) as live_products`,
    sql`select id,commit_sha,model,prompt_version,dataset_version,mode,metrics,created_at from eval_results order by created_at desc limit 10`,
    sql`select * from audit_log order by created_at desc limit 30`,
    sql`select * from app_settings`,
  ]);
  return plain({
    products,
    orders,
    refunds,
    conversations,
    rates,
    searches,
    metrics: metrics[0],
    evals,
    audit,
    settings,
  });
}
export async function audit(
  a: Actor,
  action: string,
  id: string,
  detail: Record<string, unknown> = {},
) {
  await db()`insert into audit_log(actor_id,action,entity_id,detail) values(${a.id},${action},${id},${db().json(detail as any)})`;
}
export async function setRate(
  a: Actor,
  purity: string,
  rate: number,
  confirm: boolean,
  override: boolean,
) {
  if (a.role !== 'owner') throw new AppError('Only the owner can confirm metal rates', 403);
  const [last] =
    await db()`select rate_paise from metal_rates where purity=${purity} order by created_at desc limit 1`;
  const large = last && Math.abs(rate - Number(last.rate_paise)) / Number(last.rate_paise) > 0.05;
  if (!confirm || (large && !override))
    throw new AppError(
      large
        ? 'Rate differs by more than 5%. Review and explicitly confirm the large change.'
        : 'Please confirm this rate',
      409,
    );
  const [r] =
    await db()`insert into metal_rates(purity,rate_paise,created_by) values(${purity},${rate},${a.id}) returning *`;
  await audit(a, 'rate_set', r.id, { purity, ratePaise: rate, largeChange: !!large });
  return plain(r);
}
export async function markSold(a: Actor, id: string, confirm: boolean) {
  if (a.role === 'customer') throw new AppError('Staff access required', 403);
  if (!confirm) throw new AppError('Confirm the counter sale', 409);
  await db().begin(async (tx: any) => {
    const [p] = await tx`select * from products where id=${id} for update`;
    if (!p) throw new AppError('Product not found', 404);
    if (p.status === 'sold') return;
    if (
      p.status === 'draft' ||
      (await tx`select 1 from holds where product_id=${id} and expires_at>now()`).length
    )
      throw new AppError('This piece is held or reserved. Complete its order instead.', 409);
    await tx`update products set status='sold',updated_at=now() where id=${id}`;
    await tx`delete from holds where product_id=${id}`;
  });
  await audit(a, 'counter_sale', id);
  return { ok: true };
}
export async function saveProduct(a: Actor, p: any) {
  if (a.role === 'customer') throw new AppError('Staff access required', 403);
  if (p.publish && (!p.reviewConfirmed || !p.huidVerified))
    throw new AppError('Confirm weight, purity and HUID review before publishing');
  if (p.publish && !p.imageUrl) throw new AppError('Add a product photograph before publishing');
  if (p.grossMg < p.netMg) throw new AppError('Gross weight cannot be below net weight');
  if (
    p.imageUrl &&
    !p.imageUrl.startsWith(
      process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public/catalogue/',
    )
  )
    throw new AppError('Use an uploaded catalogue image');
  const sql = db();
  const values = {
    sku: p.sku,
    name: p.name,
    description: p.description,
    description_hi: p.descriptionHi ?? '',
    category: p.category,
    purity: p.purity,
    net_mg: p.netMg,
    gross_mg: p.grossMg,
    making_bps: p.makingBps,
    making_fixed_paise: p.makingFixedPaise ?? null,
    stone_paise: p.stonePaise ?? 0,
    huid: p.huid ?? null,
    tags: p.tags ?? [],
    image_url: p.imageUrl ?? '',
    review_confirmed: p.reviewConfirmed ?? false,
    status: p.publish ? 'live' : 'draft',
    extraction: p.extraction ? sql.json(p.extraction) : null,
    updated_at: new Date(),
  };
  let saved;
  if (p.id) {
    const [old] = await sql`select status from products where id=${p.id}`;
    if (!old) throw new AppError('Product not found', 404);
    if (!['draft', 'live'].includes(old.status))
      throw new AppError('Cannot edit held, reserved or sold inventory', 409);
    [saved] =
      await sql`update products set ${sql(values)} where id=${p.id} and status in ('draft','live') returning *`;
  } else [saved] = await sql`insert into products ${sql(values)} returning *`;
  if (!saved) throw new AppError('Inventory changed while saving; reload and try again', 409);
  await audit(a, p.publish ? 'product_published' : 'draft_saved', saved.id);
  if (p.publish)
    try {
      await indexProduct(saved.id);
    } catch {
      /* A saved product remains retryable when the AI quota is exhausted. */
    }
  return plain(saved);
}
export async function restock(
  a: Actor,
  id: string,
  physicalReturnConfirmed: boolean,
  reason: string,
) {
  if (a.role !== 'owner') throw new AppError('Owner access required', 403);
  if (!physicalReturnConfirmed || reason.trim().length < 8)
    throw new AppError('Confirm the physical return and record the inspection', 400);
  await db().begin(async (tx: any) => {
    const [p] = await tx`select * from products where id=${id} for update`;
    if (!p || p.status !== 'sold')
      throw new AppError('Only a sold piece can be reviewed for return', 409);
    if ((await tx`select 1 from holds where product_id=${id} and expires_at>now()`).length)
      throw new AppError('The piece has an active hold', 409);
    const [item] =
      await tx`select i.total_paise,i.refunded_paise from order_items i join orders o on o.id=i.order_id where i.product_id=${id} and o.payment_status in ('captured','partially_refunded','refunded') order by o.created_at desc limit 1`;
    if (!item || Number(item.refunded_paise) < Number(item.total_paise))
      throw new AppError(
        'A provider-confirmed refund for this piece is required before restocking',
        409,
      );
    await tx`update products set status='live',updated_at=now() where id=${id}`;
    await tx`insert into audit_log(actor_id,action,entity_id,detail) values(${a.id},'physical_return_restocked',${id},${tx.json({ reason: reason.trim() })})`;
  });
  return { ok: true };
}
export async function fulfill(a: Actor, id: string, state: string, tracking: string) {
  if (a.role === 'customer') throw new AppError('Staff access required', 403);
  return db().begin(async (tx: any) => {
    const [o] = await tx`select * from orders where id=${id} for update`;
    if (!o || !['captured', 'partially_refunded'].includes(o.payment_status))
      throw new AppError('Only a confirmed paid order can be fulfilled', 409);
    if (o.fulfillment_status === 'completed' || o.fulfillment_status === 'cancelled')
      throw new AppError('This order is already closed', 409);
    if (o.type === 'reservation' && state === 'completed') {
      const items = await tx`select * from order_items where order_id=${id} order by product_id`;
      for (const i of items) {
        await tx`select id from products where id=${i.product_id} for update`;
        const [h] =
          await tx`select * from holds where product_id=${i.product_id} and order_id=${id} and expires_at>now()`;
        if (!h)
          throw new AppError('This reservation expired; review inventory before completing', 409);
        await tx`update products set status='sold' where id=${i.product_id}`;
        await tx`delete from holds where product_id=${i.product_id} and order_id=${id}`;
      }
    }
    await tx`update orders set fulfillment_status=${state},tracking=${tracking},updated_at=now() where id=${id}`;
    await tx`insert into audit_log(actor_id,action,entity_id,detail) values(${a.id},'fulfilment_updated',${id},${tx.json({ state, tracking })})`;
    return { ok: true };
  });
}
