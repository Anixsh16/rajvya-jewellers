export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  const r = await fetch('/api/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? 'Request failed');
  return d;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: (v: any) => void) => void;
    };
  }
}
export async function pay(o: any) {
  if (!window.Razorpay)
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Payment checkout could not load'));
      document.body.appendChild(s);
    });
  await new Promise<void>((resolve, reject) => {
    const r = new window.Razorpay!({
      key: o.keyId,
      amount: Number(o.total_paise),
      currency: 'INR',
      name: 'Rajvya · Test checkout',
      description: o.type === 'reservation' ? 'Demo reservation token' : 'Demo jewellery purchase',
      order_id: o.provider_order_id,
      theme: { color: '#672a35' },
      handler: async (v: any) => {
        try {
          await api('checkout/verify', {
            orderId: o.id,
            paymentId: v.razorpay_payment_id,
            signature: v.razorpay_signature,
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      },
      modal: {
        ondismiss: () =>
          reject(
            new Error('Checkout closed. Your order remains in your account for reconciliation.'),
          ),
      },
    });
    r.on('payment.failed', () =>
      reject(new Error('The payment attempt failed. Check your order before retrying.')),
    );
    r.open();
  });
}
