import { Suspense } from 'react';
import { Cart } from '@/components/cart';
export default function CartPage() {
  return (
    <Suspense fallback={<div className="page-wrap">Opening your bag…</div>}>
      <Cart />
    </Suspense>
  );
}
