import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '../src/lib/db';
import {
  getQuote as getTestQuote,
  requestRefund,
  paymentCaptured,
  refundProcessed,
  decideRefund,
} from '../src/lib/commerce';
import { markSold, restock, fulfill } from '../src/lib/admin';
import { price } from '../src/lib/pricing';
import type { Actor } from '../src/lib/types';
import postgres from 'postgres';
import { databaseConnection, databaseTls } from '../src/lib/database-tls';
const enabled = !!process.env.DATABASE_URL;
const getQuote = (a: Actor, ids: string[]) => getTestQuote(a, ids, { allowInternal: true });
describe.skipIf(!enabled)('Postgres inventory and payment invariants', () => {
  let a: Actor, b: Actor;
  let ids: string[] = [];
  let events: string[] = [];
  const sql = db();
  beforeAll(async () => {
    const users = await sql`select * from profiles order by role limit 2`;
    if (users.length < 2) throw new Error('Provision two fixture accounts before database tests');
    a = { id: users[0].id, name: 'test', role: 'customer' };
    b = { id: users[1].id, name: 'test', role: 'customer' };
  });
  beforeEach(async () => {
    ids = [];
    events = [];
    for (let i = 0; i < 3; i++) {
      const id = randomUUID();
      ids.push(id);
      await sql`insert into products(id,sku,name,category,purity,net_mg,gross_mg,making_bps,image_url,status,review_confirmed,internal_only) values(${id},${'TEST-' + id},'Test-only gold piece','Chains','22K',4200,4200,1200,'/images/chain.png','live',true,true)`;
    }
  });
  afterEach(async () => {
    const qs =
      await sql`select distinct quote_id from quote_items where product_id=any(${sql.array(ids)}::uuid[])`;
    const os =
      await sql`select distinct order_id from order_items where product_id=any(${sql.array(ids)}::uuid[])`;
    for (const o of os) {
      await sql`delete from refund_items where refund_id in(select id from refunds where order_id=${o.order_id})`;
      await sql`delete from refunds where order_id=${o.order_id}`;
      await sql`delete from holds where order_id=${o.order_id}`;
      await sql`delete from order_items where order_id=${o.order_id}`;
      await sql`delete from orders where id=${o.order_id}`;
    }
    for (const q of qs) await sql`delete from quotes where id=${q.quote_id}`;
    await sql`delete from products where id=any(${sql.array(ids)}::uuid[])`;
    if (events.length)
      await sql`delete from webhook_events where event_id=any(${sql.array(events)}::text[])`;
  });
  afterAll(async () => {
    await sql.end();
  });
  const begin = async (who: Actor, q: any, key = randomUUID()) => {
    const [{ id }] =
      await sql`select begin_checkout(${who.id}::uuid,${q.id}::uuid,${key},'purchase',null) as id`;
    return id;
  };
  async function capturedOrder() {
    const q = await getQuote(a, [ids[0], ids[1]]);
    const id = await begin(a, q);
    const provider = 'order_test_' + randomUUID();
    const payment = 'pay_test_' + randomUUID();
    await sql`update orders set provider_order_id=${provider},provider_state='ready' where id=${id}`;
    const p = {
      id: payment,
      order_id: provider,
      status: 'captured',
      amount: Number(q.total_paise),
      currency: 'INR',
    };
    return { id, q, p };
  }
  it('uses the same arithmetic in SQL and TypeScript', async () => {
    const q = await getQuote(a, [ids[0]]);
    const s = q.items[0].snapshot;
    expect(s.totalPaise).toBe(price(4200, s.ratePaise, 1200).totalPaise);
  });
  it('freezes a quote when the product’s making charge changes', async () => {
    const q = await getQuote(a, [ids[0]]);
    await sql`update products set making_bps=2000 where id=${ids[0]}`;
    const [item] = await sql`select snapshot from quote_items where quote_id=${q.id}`;
    expect(item.snapshot.totalPaise).toBe(q.items[0].snapshot.totalPaise);
  });
  it('rejects expired quotes', async () => {
    const q = await getQuote(a, [ids[0]]);
    await sql`update quotes set expires_at=now()-interval '1 second' where id=${q.id}`;
    await expect(begin(a, q)).rejects.toThrow(/expired/i);
  });
  it('rejects duplicate product IDs in quotes', async () => {
    await expect(getQuote(a, [ids[0], ids[0]])).rejects.toThrow();
  });
  it('rejects another customer’s quote', async () => {
    const q = await getQuote(a, [ids[0]]);
    await expect(begin(b, q)).rejects.toThrow();
  });
  it('lets exactly one buyer win overlapping carts', async () => {
    const q1 = await getQuote(a, [ids[0], ids[1]]),
      q2 = await getQuote(b, [ids[1], ids[2]]);
    const r = await Promise.allSettled([begin(a, q1), begin(b, q2)]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    const [{ count }] =
      await sql`select count(*)::int as count from holds where product_id=any(${sql.array(ids)}::uuid[])`;
    expect(count).toBe(2);
  });
  it('rolls back every hold when one cart item is unavailable', async () => {
    const q = await getQuote(a, [ids[0], ids[1]]);
    await sql`update products set status='sold' where id=${ids[1]}`;
    await expect(begin(a, q)).rejects.toThrow();
    const h = await sql`select * from holds where product_id=${ids[0]}`;
    expect(h).toHaveLength(0);
  });
  it('reuses an idempotent checkout', async () => {
    const q = await getQuote(a, [ids[0]]);
    const key = randomUUID();
    expect(await begin(a, q, key)).toBe(await begin(a, q, key));
  });
  it('releases expired stock without waiting for the cron sweep', async () => {
    const q = await getQuote(a, [ids[0]]);
    await begin(a, q);
    await sql`update holds set expires_at=now()-interval '1 second' where product_id=${ids[0]}`;
    const next = await getQuote(b, [ids[0]]);
    expect(await begin(b, next)).toBeTruthy();
  });
  it('prevents counter sale while online checkout holds a piece', async () => {
    const q = await getQuote(a, [ids[0]]);
    await begin(a, q);
    await expect(markSold({ ...b, role: 'staff' }, ids[0], true)).rejects.toThrow(/held/i);
  });
  it('processes captured payment once even under different event IDs', async () => {
    const { id, p } = await capturedOrder();
    const e1 = 'test:' + randomUUID(),
      e2 = 'test:' + randomUUID();
    events.push(e1, e2);
    await paymentCaptured(e1, p);
    await paymentCaptured(e1, p);
    await paymentCaptured(e2, p);
    const [o] = await sql`select * from orders where id=${id}`;
    expect(o.payment_status).toBe('captured');
    const sold =
      await sql`select * from products where id=any(${sql.array(ids.slice(0, 2))}::uuid[]) and status='sold'`;
    expect(sold).toHaveLength(2);
  });
  it('queues a captured amount mismatch instead of selling stock', async () => {
    const { id, p } = await capturedOrder();
    const e = 'test:' + randomUUID();
    events.push(e);
    await paymentCaptured(e, { ...p, amount: 1 });
    const [o] = await sql`select payment_status from orders where id=${id}`;
    expect(o.payment_status).toBe('exception');
  });
  it('does not steal stock on a late capture after another sale', async () => {
    const { id, p } = await capturedOrder();
    await sql`update holds set expires_at=now()-interval '1 second' where product_id=any(${sql.array(ids)}::uuid[])`;
    await sql`update products set status='sold' where id=${ids[0]}`;
    const e = 'test:' + randomUUID();
    events.push(e);
    await paymentCaptured(e, p);
    const [o] = await sql`select payment_status from orders where id=${id}`;
    expect(o.payment_status).toBe('exception');
  });
  it('rejects refunds requested for another customer’s order', async () => {
    const { id, p } = await capturedOrder();
    const e = 'test:' + randomUUID();
    events.push(e);
    await paymentCaptured(e, p);
    await expect(requestRefund(b, id, [], 'Please refund this purchase')).rejects.toThrow();
  });
  it('applies an approved item refund once without restocking', async () => {
    const { id, p } = await capturedOrder();
    const e = 'test:' + randomUUID();
    events.push(e);
    await paymentCaptured(e, p);
    const [item] = await sql`select * from order_items where order_id=${id} order by id`;
    const r = await requestRefund(a, id, [item.id], 'Please refund the selected piece');
    await sql`update refunds set status='approved',decision_by=${b.id},decision_at=now() where id=${r.id}`;
    const provider = 'rfnd_test_' + randomUUID();
    const refund = {
      id: provider,
      amount: Number(r.amount_paise),
      payment_id: p.id,
      notes: { refund_request_id: r.id },
    };
    const re = 'test:' + randomUUID();
    events.push(re);
    await refundProcessed(re, refund);
    await refundProcessed(re, refund);
    const [o] = await sql`select payment_status from orders where id=${id}`;
    expect(o.payment_status).toBe('partially_refunded');
    const [prod] = await sql`select status from products where id=${item.product_id}`;
    expect(prod.status).toBe('sold');
  });
  it('RLS reveals only this customer’s quote', async () => {
    const q1 = await getQuote(a, [ids[0]]),
      q2 = await getQuote(b, [ids[1]]);
    const visible = await sql.begin(async (tx: any) => {
      await tx`set local role authenticated`;
      await tx`select set_config('request.jwt.claim.sub',${a.id},true)`;
      return tx`select id from quotes where id=any(${tx.array([q1.id, q2.id])}::uuid[])`;
    });
    expect(visible.map((r: any) => r.id)).toEqual([q1.id]);
  });
  it('anonymous callers cannot invoke stock mutation functions', async () => {
    const q = await getQuote(a, [ids[0]]);
    await expect(
      sql.begin(async (tx: any) => {
        await tx`set local role anon`;
        await tx`select begin_checkout(${a.id}::uuid,${q.id}::uuid,${randomUUID()},'purchase',null)`;
      }),
    ).rejects.toThrow(/permission denied/i);
  });
  it('a reservation holds one piece for 48 hours only after captured token payment', async () => {
    const q = await getQuote(a, [ids[0]]);
    const [{ id }] =
      await sql`select begin_checkout(${a.id}::uuid,${q.id}::uuid,${randomUUID()},'reservation',now()+interval '1 day') as id`;
    const provider = 'order_test_' + randomUUID();
    await sql`update orders set provider_order_id=${provider} where id=${id}`;
    const e = 'test:' + randomUUID();
    events.push(e);
    await paymentCaptured(e, {
      id: 'pay_test_' + randomUUID(),
      order_id: provider,
      status: 'captured',
      amount: 100000,
      currency: 'INR',
    });
    const [o] = await sql`select * from orders where id=${id}`;
    expect(o.reservation_code).toMatch(/^RJ-/);
    expect(new Date(o.reservation_expires_at).getTime()).toBeGreaterThan(Date.now() + 47 * 3600000);
    const [p] = await sql`select status from products where id=${ids[0]}`;
    expect(p.status).toBe('reserved');
  });
  it('reservation expiry releases stock and queues one token refund without approving it', async () => {
    const q = await getQuote(a, [ids[0]]);
    const [{ id }] =
      await sql`select begin_checkout(${a.id}::uuid,${q.id}::uuid,${randomUUID()},'reservation',now()+interval '1 day') as id`;
    const provider = 'order_test_' + randomUUID();
    await sql`update orders set provider_order_id=${provider} where id=${id}`;
    const e = 'test:' + randomUUID();
    events.push(e);
    await paymentCaptured(e, {
      id: 'pay_test_' + randomUUID(),
      order_id: provider,
      status: 'captured',
      amount: 100000,
      currency: 'INR',
    });
    await sql`update holds set expires_at=now()-interval '1 second' where order_id=${id}`;
    await sql`select expire_holds()`;
    await sql`select expire_holds()`;
    const requests = await sql`select * from refunds where order_id=${id}`;
    expect(requests).toHaveLength(1);
    expect(requests[0].status).toBe('pending');
    expect(Number(requests[0].amount_paise)).toBe(100000);
    const [p] = await sql`select status from products where id=${ids[0]}`;
    expect(p.status).toBe('live');
  });
  it('expiry also cancels a ready reservation and queues its token review', async () => {
    const q = await getQuote(a, [ids[0]]);
    const [{ id }] =
      await sql`select begin_checkout(${a.id}::uuid,${q.id}::uuid,${randomUUID()},'reservation',now()+interval '1 day') as id`;
    const provider = 'order_test_' + randomUUID();
    await sql`update orders set provider_order_id=${provider} where id=${id}`;
    const e = 'test:' + randomUUID();
    events.push(e);
    await paymentCaptured(e, {
      id: 'pay_test_' + randomUUID(),
      order_id: provider,
      status: 'captured',
      amount: 100000,
      currency: 'INR',
    });
    await sql`update orders set fulfillment_status='ready' where id=${id}`;
    await sql`update holds set expires_at=now()-interval '1 second' where order_id=${id}`;
    await sql`select expire_holds()`;
    const [o] = await sql`select fulfillment_status from orders where id=${id}`;
    expect(o.fulfillment_status).toBe('cancelled');
    expect(await sql`select 1 from refunds where order_id=${id} and status='pending'`).toHaveLength(
      1,
    );
  });
  it('a paid exception refunds only the captured amount and releases unfulfilled holds', async () => {
    const { id, p } = await capturedOrder();
    const e = 'test:' + randomUUID();
    events.push(e);
    await paymentCaptured(e, { ...p, amount: 100 });
    const r = await requestRefund(a, id, [], 'Refund the mismatched test capture');
    expect(Number(r.amount_paise)).toBe(100);
    const [{ total }] =
      await sql`select sum(amount_paise) as total from refund_items where refund_id=${r.id}`;
    expect(Number(total)).toBe(100);
    await sql`update refunds set status='approved',decision_by=${b.id} where id=${r.id}`;
    const re = 'test:' + randomUUID();
    events.push(re);
    await refundProcessed(re, {
      id: 'rfnd_test_' + randomUUID(),
      amount: 100,
      payment_id: p.id,
      currency: 'INR',
      notes: { refund_request_id: r.id },
    });
    const [o] = await sql`select payment_status from orders where id=${id}`;
    expect(o.payment_status).toBe('refunded');
    expect(await sql`select 1 from holds where order_id=${id}`).toHaveLength(0);
    const [piece] = await sql`select status from products where id=${ids[0]}`;
    expect(piece.status).toBe('live');
  });
  it('unexpected capture currency requires provider review instead of an INR refund', async () => {
    const { id, p } = await capturedOrder();
    const e = 'test:' + randomUUID();
    events.push(e);
    await paymentCaptured(e, { ...p, currency: 'USD' });
    await expect(requestRefund(a, id, [], 'Refund the unexpected currency')).rejects.toThrow(
      /currency/i,
    );
  });
  it('expiry waiting for an order leaves its late payment inventory locks available', async () => {
    const qa = await getQuote(a, [ids[1], ids[2]]),
      qb = await getQuote(b, [ids[0], ids[1]]);
    const oa = '10000000-0000-4000-8000-' + randomUUID().slice(-12),
      ob = 'f0000000-0000-4000-8000-' + randomUUID().slice(-12);
    await sql.begin(async (tx: any) => {
      for (const [oid, who, q] of [
        [ob, b, qb],
        [oa, a, qa],
      ] as const) {
        await tx`insert into orders(id,customer_id,quote_id,type,idempotency_key,total_paise,hold_expires_at,internal_only) values(${oid},${who.id},${q.id},'purchase',${randomUUID()},${q.total_paise},now()-interval '1 second',true)`;
        await tx`insert into order_items(order_id,product_id,snapshot,total_paise) select ${oid},product_id,snapshot,total_paise from quote_items where quote_id=${q.id}`;
        const items = await tx`select product_id from quote_items where quote_id=${q.id}`;
        for (const item of items) {
          await tx`update products set status='held' where id=${item.product_id}`;
          await tx`insert into holds(product_id,order_id,expires_at) values(${item.product_id},${oid},now()-interval '1 second') on conflict(product_id) do update set order_id=excluded.order_id,expires_at=excluded.expires_at`;
        }
      }
    });
    let unlock!: () => void, locked!: () => void;
    const gate = new Promise<void>((r) => {
        unlock = r;
      }),
      ready = new Promise<void>((r) => {
        locked = r;
      });
    const name = 'expiry-race-' + randomUUID();
    const control = postgres(databaseConnection(), { ssl: databaseTls(), max: 1, prepare: false });
    const payment = sql.begin(async (tx: any) => {
      await tx`select id from orders where id=${ob} for update`;
      locked();
      await gate;
      await tx`select id from products where id=any(${tx.array(ids.slice(0, 2))}::uuid[]) order by id for update nowait`;
    });
    await ready;
    const expiry = sql.begin(async (tx: any) => {
      await tx`select set_config('application_name',${name},true)`;
      await tx`select expire_holds()`;
    });
    try {
      let waiting = false;
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        const [s] =
          await control`select wait_event_type from pg_stat_activity where application_name=${name}`;
        if (s?.wait_event_type === 'Lock') {
          waiting = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      expect(waiting).toBe(true);
      unlock();
      await payment;
      await expiry;
    } finally {
      unlock();
      await Promise.allSettled([payment, expiry]);
      await control.end();
    }
  });
  it('rejects new quotes when today’s rate has not been confirmed', async () => {
    await expect(
      sql.begin(async (tx: any) => {
        await tx`update metal_rates set rate_date=rate_date-1 where purity='22K' and rate_date=(now() at time zone 'Asia/Kolkata')::date`;
        await tx`select make_quote(${a.id}::uuid,${tx.array([ids[0]])}::uuid[])`;
      }),
    ).rejects.toThrow(/rate/i);
  });
  it('keeps the quoted rate after a later rate change', async () => {
    await expect(
      sql.begin(async (tx: any) => {
        const [{ id }] =
          await tx`select make_quote(${a.id}::uuid,${tx.array([ids[0]])}::uuid[]) as id`;
        const [before] = await tx`select snapshot from quote_items where quote_id=${id}`;
        await tx`insert into metal_rates(purity,rate_paise,created_at) values('22K',1000000,now()+interval '1 second')`;
        const [after] = await tx`select snapshot from quote_items where quote_id=${id}`;
        const [current] =
          await tx`select calculate_price(p,1000000) as price from products p where id=${ids[0]}`;
        expect(after.snapshot.totalPaise).toBe(before.snapshot.totalPaise);
        expect(current.price.totalPaise).not.toBe(before.snapshot.totalPaise);
        throw new Error('rollback-rate-fixture');
      }),
    ).rejects.toThrow('rollback-rate-fixture');
  });
  it('requires owner physical inspection after an item refund before restocking', async () => {
    const { id, p } = await capturedOrder();
    const e = 'test:' + randomUUID();
    events.push(e);
    await paymentCaptured(e, p);
    const [item] = await sql`select * from order_items where order_id=${id} order by id`;
    await expect(
      restock({ ...b, role: 'owner' }, item.product_id, true, 'Inspected sample return'),
    ).rejects.toThrow(/refund/i);
    const r = await requestRefund(a, id, [item.id], 'Return of one test piece');
    await sql`update refunds set status='approved',decision_by=${b.id} where id=${r.id}`;
    const re = 'test:' + randomUUID();
    events.push(re);
    await refundProcessed(re, {
      id: 'rfnd_test_' + randomUUID(),
      amount: Number(r.amount_paise),
      payment_id: p.id,
      notes: { refund_request_id: r.id },
    });
    await expect(
      restock({ ...b, role: 'staff' }, item.product_id, true, 'Inspected sample return'),
    ).rejects.toThrow(/Owner/i);
    await expect(
      restock({ ...b, role: 'owner' }, item.product_id, false, 'Inspected sample return'),
    ).rejects.toThrow(/physical/i);
    await restock(
      { ...b, role: 'owner' },
      item.product_id,
      true,
      'Inspected disposable sample return',
    );
    const [prod] = await sql`select status from products where id=${item.product_id}`;
    expect(prod.status).toBe('live');
    await expect(requestRefund(a, id, [item.id], 'Repeat refund for same piece')).rejects.toThrow(
      /already/i,
    );
  });
  it('a confirmed reservation refund cancels the visit and releases its own hold', async () => {
    const q = await getQuote(a, [ids[0]]);
    const [{ id }] =
      await sql`select begin_checkout(${a.id}::uuid,${q.id}::uuid,${randomUUID()},'reservation',now()+interval '1 day') as id`;
    const provider = 'order_test_' + randomUUID(),
      payment = 'pay_test_' + randomUUID();
    await sql`update orders set provider_order_id=${provider} where id=${id}`;
    const e = 'test:' + randomUUID();
    events.push(e);
    await paymentCaptured(e, {
      id: payment,
      order_id: provider,
      status: 'captured',
      amount: 100000,
      currency: 'INR',
    });
    const r = await requestRefund(a, id, [], 'Cancel simulated store visit');
    await sql`update refunds set status='approved',decision_by=${b.id} where id=${r.id}`;
    const re = 'test:' + randomUUID();
    events.push(re);
    await refundProcessed(re, {
      id: 'rfnd_test_' + randomUUID(),
      amount: 100000,
      payment_id: payment,
      notes: { refund_request_id: r.id },
    });
    expect(await sql`select 1 from holds where order_id=${id}`).toHaveLength(0);
    const [o] = await sql`select fulfillment_status from orders where id=${id}`;
    expect(o.fulfillment_status).toBe('cancelled');
    const [prod] = await sql`select status from products where id=${ids[0]}`;
    expect(prod.status).toBe('live');
  });
  it('counter conversion preserves the frozen reservation price and consumes its hold once', async () => {
    const q = await getQuote(a, [ids[0]]);
    const [{ id }] =
      await sql`select begin_checkout(${a.id}::uuid,${q.id}::uuid,${randomUUID()},'reservation',now()+interval '1 day') as id`;
    const provider = 'order_test_' + randomUUID();
    await sql`update orders set provider_order_id=${provider} where id=${id}`;
    const e = 'test:' + randomUUID();
    events.push(e);
    await paymentCaptured(e, {
      id: 'pay_test_' + randomUUID(),
      order_id: provider,
      status: 'captured',
      amount: 100000,
      currency: 'INR',
    });
    await sql`update products set making_bps=9000 where id=${ids[0]}`;
    await expect(fulfill(a, id, 'completed', 'Counter fixture')).rejects.toThrow(/staff/i);
    await fulfill({ ...b, role: 'staff' }, id, 'completed', 'Simulated counter balance collected');
    const [o] =
      await sql`select payment_status,fulfillment_status,total_paise from orders where id=${id}`;
    const [item] = await sql`select total_paise from order_items where order_id=${id}`;
    expect(o.fulfillment_status).toBe('completed');
    expect(o.payment_status).toBe('captured');
    expect(Number(item.total_paise)).toBe(Number(q.total_paise));
    expect(Number(item.total_paise) - Number(o.total_paise)).toBe(Number(q.total_paise) - 100000);
    expect(await sql`select 1 from holds where order_id=${id}`).toHaveLength(0);
    const [piece] = await sql`select status from products where id=${ids[0]}`;
    expect(piece.status).toBe('sold');
    await expect(fulfill({ ...b, role: 'staff' }, id, 'completed', 'Repeat')).rejects.toThrow(
      /closed/i,
    );
  });
  it('refund rejection and repeated approval cannot replace an owner decision', async () => {
    const { id, p } = await capturedOrder();
    const e = 'test:' + randomUUID();
    events.push(e);
    await paymentCaptured(e, p);
    const r = await requestRefund(a, id, [], 'Owner decision fixture');
    await expect(decideRefund({ ...b, role: 'staff' }, r.id, true)).rejects.toThrow(/owner/i);
    expect((await decideRefund({ ...b, role: 'owner' }, r.id, false)).status).toBe('rejected');
    expect((await decideRefund({ ...b, role: 'owner' }, r.id, true)).status).toBe('rejected');
    const next = await requestRefund(a, id, [], 'New request after rejected review');
    expect(next.id).not.toBe(r.id);
    expect((await decideRefund({ ...b, role: 'owner' }, next.id, true)).status).toBe('approved');
    expect((await decideRefund({ ...b, role: 'owner' }, next.id, true)).status).toBe('approved');
    expect(
      await sql`select 1 from audit_log where entity_id=${next.id} and action='refund_approved'`,
    ).toHaveLength(1);
  });
});
