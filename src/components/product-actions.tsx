'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, ArrowRight, MapPin, LoaderCircle } from 'lucide-react';
import type { Product } from '@/lib/types';
import { useShop } from './shell';
import { api, pay } from '@/lib/client';
export function ProductActions({ product: p }: { product: Product }) {
  const { add } = useShop();
  const router = useRouter();
  const [reserve, setReserve] = useState(false);
  const [visit, setVisit] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const available = p.availability === 'live' && !!p.price;
  async function submit() {
    setError('');
    setBusy(true);
    try {
      if (!visit) throw new Error('Choose a visit time within the next 48 hours');
      const q = await api('quotes', { productIds: [p.id] });
      const o = await api('checkout', {
        quoteId: q.id,
        type: 'reservation',
        visitAt: new Date(visit).toISOString(),
        idempotencyKey: 'reservation-' + q.id,
      });
      await pay(o);
      router.push('/account');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="product-actions">
      <button className="button primary" disabled={!available} onClick={() => add(p.id)}>
        <ShoppingBag size={16} />
        {available ? 'Add this piece to your bag' : 'Currently unavailable'}
      </button>
      {available && p.price!.totalPaise > 2500000 && (
        <button className="button secondary" onClick={() => setReserve(!reserve)}>
          <MapPin size={16} />
          Reserve & visit <ArrowRight size={14} />
        </button>
      )}
      {reserve && (
        <div className="reservation-form">
          <h3>See how it feels.</h3>
          <p>
            A ₹1,000 test token holds this piece for 48 hours after confirmed payment. It is
            credited towards the frozen quoted price. Visits are simulated.
          </p>
          <label className="field">
            Choose a visit time
            <input type="datetime-local" value={visit} onChange={(e) => setVisit(e.target.value)} />
          </label>
          <button className="button primary" onClick={submit} disabled={busy}>
            {busy ? <LoaderCircle size={15} className="spin" /> : 'Confirm & pay test token'}
          </button>
        </div>
      )}
      {error && (
        <p className="error">
          {error}
          {/sign in/i.test(error) && (
            <>
              {' '}
              <a href="/login">Sign in →</a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
