import { createHmac, timingSafeEqual } from 'node:crypto';

// The HTTP queue receives a short-lived, path-bound signature, never the key.
export function signedCronNonce(req: Request, secret: string, now = Date.now()) {
  const timestamp = req.headers.get('x-rajvya-timestamp') ?? '';
  const nonce = req.headers.get('x-rajvya-nonce') ?? '';
  const signature = req.headers.get('x-rajvya-signature') ?? '';
  const path = new URL(req.url).pathname;
  if (
    !secret ||
    req.method !== 'POST' ||
    path !== '/api/cron/reconcile' ||
    !/^\d{10}$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 120 ||
    !/^[0-9a-f-]{36}$/.test(nonce) ||
    !/^[0-9a-f]{64}$/.test(signature)
  )
    return null;
  const expected = createHmac('sha256', secret).update(`${timestamp}:${nonce}:${path}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex')) ? nonce : null;
}
