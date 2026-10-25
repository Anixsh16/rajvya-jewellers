import { db } from './db';
import { reconcile, reconcileRefund } from './commerce';
import { AppError } from './auth';
import type { Actor } from './types';
import { signedCronNonce } from './cron-auth';

export async function authorizeCron(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new AppError('Unauthorized', 401);
  if (req.headers.get('authorization') === 'Bearer ' + secret) return;
  const nonce = signedCronNonce(req, secret);
  if (!nonce) throw new AppError('Unauthorized', 401);
  const [{ ok }] = await db()`select allow_request(${'signed-cron:' + nonce},1,300) as ok`;
  if (!ok) throw new AppError('Expired or replayed invocation', 401);
}

// A time-limited lease in Postgres survives function instances and prevents two
// scheduled invocations from simultaneously processing the same batch.
export async function reconcilePending() {
  const [{ ok }] =
    await db()`select allow_request('scheduled-provider-reconciliation',1,240) as ok`;
  if (!ok) return { busy: true, checked: 0, errors: 0 };
  const [owner] =
    await db()`select id,name,role from profiles where role='owner' order by created_at limit 1`;
  if (!owner) throw new AppError('Owner is not provisioned', 503);
  const a = owner as Actor;
  let checked = 0,
    errors = 0;
  const orders =
    await db()`update orders set reconciled_at=now() where id in (select id from orders where not internal_only and payment_status='pending' and provider_order_id is not null and created_at>now()-interval '3 days' and (reconciled_at is null or reconciled_at<now()-interval '5 minutes') order by reconciled_at nulls first,created_at limit 4) returning id`;
  for (const o of orders) {
    try {
      await reconcile(a, o.id);
      checked++;
    } catch {
      errors++;
    }
  }
  const refunds =
    await db()`update refunds set reconciled_at=now() where id in (select r.id from refunds r join orders o on o.id=r.order_id where not o.internal_only and r.status in ('processing','uncertain') and (r.reconciled_at is null or r.reconciled_at<now()-interval '5 minutes') order by r.reconciled_at nulls first,r.created_at limit 2) returning id`;
  for (const r of refunds) {
    try {
      await reconcileRefund(a, r.id);
      checked++;
    } catch {
      errors++;
    }
  }
  return { busy: false, checked, errors };
}
