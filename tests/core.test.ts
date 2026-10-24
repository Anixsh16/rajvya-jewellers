import {describe,it,expect} from 'vitest';
import {price} from '../src/lib/pricing';
import {signatureOK} from '../src/lib/payments';
import {createHmac} from 'node:crypto';
import {parseCSV} from '../src/lib/csv';
describe('deterministic money',()=>{
 it('matches the guide’s 22K worked example exactly in paise',()=>{expect(price(4200,915000,1200)).toEqual({metalPaise:3843000,makingPaise:461160,stonePaise:0,subtotalPaise:4304160,taxPaise:129125,totalPaise:4433285});});
 it('rounds a fractional gram before making charges',()=>{expect(price(1001,101,1000).metalPaise).toBe(101);});
 it('fixed making charges override percentages',()=>{const p=price(6500,10000,1200,0,180000);expect(p.makingPaise).toBe(180000);expect(p.totalPaise).toBe(252350);});
 it('includes stone charges in the sample tax base',()=>{expect(price(1000,10000,0,10000).taxPaise).toBe(600);});
 it('uses half-up rounding at tax boundary',()=>{expect(price(1000,50,0).taxPaise).toBe(2);});
 it('avoids floating point accumulation on large values',()=>{expect(Number.isSafeInteger(price(1000000,100000000,10000,1000000).totalPaise)).toBe(true);});
});
describe('provider signatures',()=>{
 const secret='unit-test-only';const body='{"event":"payment.captured"}';const sig=createHmac('sha256',secret).update(body).digest('hex');
 it('accepts an exact signed raw body',()=>expect(signatureOK(body,sig,secret)).toBe(true));
 it('rejects body whitespace changes',()=>expect(signatureOK(body+' ',sig,secret)).toBe(false));
 it('rejects forged signatures',()=>expect(signatureOK(body,'0'.repeat(64),secret)).toBe(false));
 it('rejects malformed signatures without timing comparison exceptions',()=>{for(const s of ['', 'abc','z'.repeat(64),'0'.repeat(66)])expect(signatureOK(body,s,secret)).toBe(false);});
});
describe('catalogue import',()=>{
 it('parses quoted commas and escaped quotes',()=>{expect(parseCSV('sku,name\nA,"A chain, called ""Light"""')[0]).toEqual({sku:'A',name:'A chain, called "Light"'});});
 it('preserves multiline descriptions',()=>{expect(parseCSV('sku,description\r\nA,"one\ntwo"')[0].description).toBe('one\ntwo');});
 it('rejects malformed row lengths',()=>expect(()=>parseCSV('a,b\nx,y,z')).toThrow());
 it('rejects duplicate headers',()=>expect(()=>parseCSV('sku,sku\na,b')).toThrow());
 it('rejects unfinished quoting',()=>expect(()=>parseCSV('a,b\nx,"y')).toThrow());
});
