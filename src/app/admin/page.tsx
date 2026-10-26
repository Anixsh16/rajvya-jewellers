import { actor } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AdminPanel } from '@/components/admin-panel';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const a = await actor(false);
  if (!a) redirect('/login?next=/admin');
  if (a.role === 'customer')
    return (
      <div className="empty-state">
        <h1 className="page-title">Owner access required.</h1>
        <p>
          You’re signed in with a customer account. Use your assigned owner or staff account to open
          this workspace.
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginTop: 24,
          }}
        >
          <Link className="button primary" href="/login?next=/admin">
            Sign in with owner account
          </Link>
          <Link className="button secondary" href="/#collection">
            Back to collection
          </Link>
        </div>
      </div>
    );
  return <AdminPanel role={a.role} />;
}
