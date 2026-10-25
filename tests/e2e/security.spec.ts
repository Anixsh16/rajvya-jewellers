import { test, expect, type BrowserContext } from '@playwright/test';
import { randomUUID, createHmac } from 'node:crypto';
import { db } from '../../src/lib/db';
const local =
  !!process.env.DATABASE_URL &&
  ['localhost', '127.0.0.1', '::1'].includes(new URL(process.env.DATABASE_URL).hostname);
test.describe('isolated API and concurrent checkout journeys', () => {
  test.skip(!local, 'Stateful HTTP verification requires the disposable local stack.');
  let first: BrowserContext, second: BrowserContext, uid: string;
  const products: string[] = [];
  const conversations: string[] = [];
  const events: string[] = [];
  test.beforeAll(async ({ browser }) => {
    first = await browser.newContext({ baseURL: process.env.E2E_BASE_URL });
    second = await browser.newContext({ baseURL: process.env.E2E_BASE_URL });
    expect((await first.request.post('/api/auth/demo', { data: {} })).ok()).toBe(true);
    expect((await second.request.post('/api/auth/demo', { data: {} })).ok()).toBe(true);
    uid = (await (await first.request.get('/api/auth/me')).json()).user.id;
  });
  test('anonymous and customer sessions cannot access owner operations', async ({ request }) => {
    expect((await request.get('/api/admin')).status()).toBe(401);
    expect((await first.request.get('/api/admin')).status()).toBe(403);
    expect(
      (
        await first.request.post('/api/admin/rates', {
          data: { purity: '22K', ratePaise: 1, confirm: true },
        })
      ).status(),
    ).toBe(403);
    expect((await first.request.get('/api/admin/calibration')).status()).toBe(403);
  });
  test('forged webhooks and missing cron credentials have no authority', async ({ request }) => {
    expect(
      (
        await request.post('/api/webhooks/razorpay', {
          data: { event: 'payment.captured' },
          headers: { 'x-razorpay-signature': '0'.repeat(64) },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await request.post('/api/cron/reconcile', {
          data: {},
          headers: { Authorization: 'Bearer undefined' },
        })
      ).status(),
    ).toBe(401);
  });
  test('a signed scheduled request is accepted once and cannot be replayed', async ({
    request,
  }) => {
    const timestamp = String(Math.floor(Date.now() / 1000)),
      nonce = randomUUID();
    const signature = createHmac('sha256', process.env.CRON_SECRET!)
      .update(`${timestamp}:${nonce}:/api/cron/reconcile`)
      .digest('hex');
    const headers = {
      'x-rajvya-timestamp': timestamp,
      'x-rajvya-nonce': nonce,
      'x-rajvya-signature': signature,
    };
    expect((await request.post('/api/cron/reconcile', { data: {}, headers })).status()).toBe(200);
    expect((await request.post('/api/cron/reconcile', { data: {}, headers })).status()).toBe(401);
  });
  test('a signed event arriving before its order rolls back its receipt for retry', async ({
    request,
  }) => {
    const id = 'browser-test:' + randomUUID();
    events.push(id);
    const body = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_unregistered_fixture',
            order_id: 'order_unregistered_fixture',
            status: 'captured',
            amount: 100,
            currency: 'INR',
          },
        },
      },
    });
    const signature = createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');
    for (let i = 0; i < 2; i++)
      expect(
        (
          await request.post('/api/webhooks/razorpay', {
            data: body,
            headers: {
              'Content-Type': 'application/json',
              'x-razorpay-signature': signature,
              'x-razorpay-event-id': id,
            },
          })
        ).status(),
      ).toBe(503);
    expect(await db()`select 1 from webhook_events where event_id=${id}`).toHaveLength(0);
  });
  test('another customer cannot read a persisted conversation', async () => {
    const [c] =
      await db()`insert into conversations(customer_id,internal_only) values(${uid},true) returning id`;
    conversations.push(c.id);
    expect((await first.request.get('/api/conversations/' + c.id)).status()).toBe(200);
    expect((await second.request.get('/api/conversations/' + c.id)).status()).toBe(404);
  });
  test('cross-origin writes are rejected and browser totals cannot change a quote', async () => {
    const [p] =
      await db()`select id,price from catalogue where availability='live' and price is not null order by sku limit 1`;
    expect(
      (
        await first.request.post('/api/quotes', {
          data: { productIds: [p.id] },
          headers: { Origin: 'https://attacker.invalid' },
        })
      ).status(),
    ).toBe(403);
    const response = await first.request.post('/api/quotes', {
      data: { productIds: [p.id], totalPaise: 1 },
    });
    expect(response.ok()).toBe(true);
    expect(Number((await response.json()).total_paise)).toBe(p.price.totalPaise);
  });
  test('internal fixture IDs cannot be turned into customer quotes', async () => {
    const id = randomUUID();
    await db()`insert into products(id,sku,name,category,purity,net_mg,gross_mg,making_bps,image_url,status,review_confirmed,internal_only) values(${id},${'PRIVATE-' + id},'Internal test fixture','Chains','22K',4200,4200,1200,'/images/chain.png','live',true,true)`;
    try {
      expect(
        (await first.request.post('/api/quotes', { data: { productIds: [id] } })).status(),
      ).toBe(404);
    } finally {
      await db()`delete from quotes where id in(select quote_id from quote_items where product_id=${id})`;
      await db()`delete from products where id=${id}`;
    }
  });
  test('two customer checkouts acquire one complete overlapping cart', async () => {
    for (let i = 0; i < 3; i++) {
      const id = randomUUID();
      products.push(id);
      await db()`insert into products(id,sku,name,category,purity,net_mg,gross_mg,making_bps,image_url,status,review_confirmed) values(${id},${'BROWSER-' + id},'Disposable concurrency fixture','Chains','22K',4200,4200,1200,'/images/chain.png','live',true)`;
    }
    const qa = await (
      await first.request.post('/api/quotes', { data: { productIds: products.slice(0, 2) } })
    ).json();
    const qb = await (
      await second.request.post('/api/quotes', { data: { productIds: products.slice(1, 3) } })
    ).json();
    const results = await Promise.all([
      first.request.post('/api/checkout', {
        data: { quoteId: qa.id, idempotencyKey: randomUUID() },
      }),
      second.request.post('/api/checkout', {
        data: { quoteId: qb.id, idempotencyKey: randomUUID() },
      }),
    ]);
    expect(results.map((r) => r.status()).sort()).toEqual([409, 503]);
    const holds =
      await db()`select order_id,product_id from holds where product_id=any(${db().array(products)}::uuid[])`;
    expect(holds).toHaveLength(2);
    expect(new Set(holds.map((h) => h.order_id)).size).toBe(1);
  });
  test.afterAll(async () => {
    if (products.length) {
      const orders =
        await db()`select distinct order_id from order_items where product_id=any(${db().array(products)}::uuid[])`;
      for (const o of orders) {
        await db()`delete from holds where order_id=${o.order_id}`;
        await db()`delete from orders where id=${o.order_id}`;
      }
      await db()`delete from quotes where id in(select quote_id from quote_items where product_id=any(${db().array(products)}::uuid[]))`;
      await db()`delete from products where id=any(${db().array(products)}::uuid[])`;
    }
    if (conversations.length)
      await db()`delete from conversations where id=any(${db().array(conversations)}::uuid[])`;
    if (events.length)
      await db()`delete from webhook_events where event_id=any(${db().array(events)}::text[])`;
    await first?.close();
    await second?.close();
    await db().end();
  });
});
