'use client';
import { JewelleryImage } from '@/components/jewellery-image';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, LoaderCircle, Sparkles } from 'lucide-react';
import { api } from '@/lib/client';
import { safeReturnPath } from '@/lib/navigation';
export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const params = useSearchParams();
  const returnPath = safeReturnPath(params.get('next'));
  const ownerLogin = /^\/admin(?:[/?#]|$)/.test(returnPath);
  async function login(demo = false) {
    setBusy(true);
    setError('');
    try {
      await api(demo ? 'auth/demo' : 'auth/login', demo ? {} : { email, password });
      if (ownerLogin) {
        const { user } = await api<{ user: { role: string } | null }>('auth/me');
        if (user?.role !== 'owner' && user?.role !== 'staff')
          throw new Error(
            'This is a customer account. Sign in with your assigned owner or staff credentials.',
          );
      }
      // Start a fresh server navigation so a prior account's cached page is not reused.
      window.location.assign(returnPath);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-wrap">
      <div className="login-art">
        <JewelleryImage src="/images/chain.png" alt="A fine gold pendant on ivory stone" />
        <p>
          Something to make
          <br />
          <em>your everyday special.</em>
        </p>
      </div>
      <div className="login-form">
        <p className="eyebrow">{ownerLogin ? 'OWNER WORKSPACE' : 'WELCOME TO RAJVYA'}</p>
        <h1 className="page-title">
          {ownerLogin ? 'Owner & staff sign in' : 'A little more personal.'}
        </h1>
        <p className="muted small">
          {ownerLogin
            ? 'Use your assigned owner or staff email and password to open the workspace.'
            : 'Sign in to keep track of your pieces, orders and conversations.'}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            login();
          }}
        >
          <label className="field">
            Email address
            <input
              required
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            Password
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={16} /> : 'Sign in'}
            <ArrowRight size={15} />
          </button>
        </form>
        {!ownerLogin && (
          <>
            <div className="login-divider">JUST EXPLORING?</div>
            <button className="button secondary" disabled={busy} onClick={() => login(true)}>
              <Sparkles size={15} />
              Continue with a fresh demo identity
            </button>
          </>
        )}
        <p className="small muted" style={{ marginTop: 18 }}>
          {ownerLogin
            ? 'Owner and staff accounts are assigned separately from customer demo identities.'
            : 'Each demo identity has its own orders and conversations. Use sample information only. Owner access is private.'}
        </p>
      </div>
    </div>
  );
}
