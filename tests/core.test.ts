import { describe, it, expect } from 'vitest';
import { price } from '../src/lib/pricing';
import { signatureOK } from '../src/lib/payments';
import { createHmac } from 'node:crypto';
import { parseCSV } from '../src/lib/csv';
import { customerConstraints } from '../src/lib/constraints';
import { keywordQuery } from '../src/lib/search-query';
import { safeReturnPath } from '../src/lib/navigation';
import { signedCronNonce } from '../src/lib/cron-auth';

describe('scheduled request signatures', () => {
  const secret = 'local-signing-test-only',
    timestamp = '1792900000',
    nonce = '12f57337-785a-4cc3-89ef-e8ce979e61aa';
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}:${nonce}:/api/cron/reconcile`)
    .digest('hex');
  const request = (path = '/api/cron/reconcile', sig = signature) =>
    new Request('https://example.invalid' + path, {
      method: 'POST',
      headers: {
        'x-rajvya-timestamp': timestamp,
        'x-rajvya-nonce': nonce,
        'x-rajvya-signature': sig,
      },
    });
  it('accepts an authentic fresh invocation', () =>
    expect(signedCronNonce(request(), secret, Number(timestamp) * 1000)).toBe(nonce));
  it('rejects an expired, forged or differently scoped invocation', () => {
    expect(signedCronNonce(request(), secret, (Number(timestamp) + 121) * 1000)).toBeNull();
    expect(signedCronNonce(request(), '', Number(timestamp) * 1000)).toBeNull();
    expect(
      signedCronNonce(request('/api/cron/expire'), secret, Number(timestamp) * 1000),
    ).toBeNull();
    expect(
      signedCronNonce(
        request('/api/cron/reconcile', '0'.repeat(64)),
        secret,
        Number(timestamp) * 1000,
      ),
    ).toBeNull();
  });
});
describe('login return destinations', () => {
  it('preserves a local checkout destination', () =>
    expect(safeReturnPath('/cart?quote=sample#review')).toBe('/cart?quote=sample#review'));
  it('rejects scripts and foreign or ambiguous origins', () => {
    for (const value of [
      'javascript:alert(1)',
      'https://attacker.invalid',
      '//attacker.invalid',
      '/\\attacker.invalid',
      '/\n/attacker.invalid',
    ])
      expect(safeReturnPath(value)).toBe('/account');
  });
});
describe('natural keyword queries', () => {
  it('retains jewellery terms without requiring filler words', () =>
    expect(keywordQuery('Show simple daily earrings under 25000 rupees')).toBe(
      'simple OR daily OR earrings',
    ));
  it('normalizes Hinglish and keeps explicit purity', () =>
    expect(keywordQuery('halka 18K jhumka dikhao')).toBe('light OR daily OR 18k OR earrings'));
  it('treats tsquery syntax in user input as ordinary tokens', () =>
    expect(keywordQuery("gold'); DROP TABLE products --")).toBe(
      'gold OR drop OR table OR products',
    ));
});
describe('customer constraints', () => {
  it('parses a rupee budget and preserves exact purity', () =>
    expect(customerConstraints(['18K earrings under ₹25,000'])).toEqual({
      maxPaise: 2500000,
      purity: '18K',
    }));
  it('handles k and lakh budget shorthand', () => {
    expect(customerConstraints(['under 40k']).maxPaise).toBe(4000000);
    expect(customerConstraints(['budget 1.2 lakh']).maxPaise).toBe(12000000);
  });
  it('keeps a prior budget through follow-up messages', () =>
    expect(customerConstraints(['under 30000', 'show earrings']).maxPaise).toBe(3000000));
  it('lets an explicit newer budget replace the old one', () =>
    expect(customerConstraints(['under 30000', 'budget to 40000']).maxPaise).toBe(4000000));
});
describe('deterministic money', () => {
  it('matches the guide’s 22K worked example exactly in paise', () => {
    expect(price(4200, 915000, 1200)).toEqual({
      metalPaise: 3843000,
      makingPaise: 461160,
      stonePaise: 0,
      subtotalPaise: 4304160,
      taxPaise: 129125,
      totalPaise: 4433285,
    });
  });
  it('rounds a fractional gram before making charges', () => {
    expect(price(1001, 101, 1000).metalPaise).toBe(101);
  });
  it('fixed making charges override percentages', () => {
    const p = price(6500, 10000, 1200, 0, 180000);
    expect(p.makingPaise).toBe(180000);
    expect(p.totalPaise).toBe(252350);
  });
  it('includes stone charges in the sample tax base', () => {
    expect(price(1000, 10000, 0, 10000).taxPaise).toBe(600);
  });
  it('uses half-up rounding at tax boundary', () => {
    expect(price(1000, 50, 0).taxPaise).toBe(2);
  });
  it('avoids floating point accumulation on large values', () => {
    expect(Number.isSafeInteger(price(1000000, 100000000, 10000, 1000000).totalPaise)).toBe(true);
  });
});
describe('provider signatures', () => {
  const secret = 'unit-test-only';
  const body = '{"event":"payment.captured"}';
  const sig = createHmac('sha256', secret).update(body).digest('hex');
  it('accepts an exact signed raw body', () => expect(signatureOK(body, sig, secret)).toBe(true));
  it('rejects body whitespace changes', () =>
    expect(signatureOK(body + ' ', sig, secret)).toBe(false));
  it('rejects forged signatures', () =>
    expect(signatureOK(body, '0'.repeat(64), secret)).toBe(false));
  it('rejects malformed signatures without timing comparison exceptions', () => {
    for (const s of ['', 'abc', 'z'.repeat(64), '0'.repeat(66)])
      expect(signatureOK(body, s, secret)).toBe(false);
  });
});
describe('catalogue import', () => {
  it('parses quoted commas and escaped quotes', () => {
    expect(parseCSV('sku,name\nA,"A chain, called ""Light"""')[0]).toEqual({
      sku: 'A',
      name: 'A chain, called "Light"',
    });
  });
  it('preserves multiline descriptions', () => {
    expect(parseCSV('sku,description\r\nA,"one\ntwo"')[0].description).toBe('one\ntwo');
  });
  it('rejects malformed row lengths', () => expect(() => parseCSV('a,b\nx,y,z')).toThrow());
  it('rejects duplicate headers', () => expect(() => parseCSV('sku,sku\na,b')).toThrow());
  it('rejects unfinished quoting', () => expect(() => parseCSV('a,b\nx,"y')).toThrow());
});
