import { actor } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminPanel } from '@/components/admin-panel';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const a = await actor(false);
  if (!a) redirect('/login?next=/admin');
  if (a.role === 'customer')
    return (
      <div className="empty-state">
        <h1 className="page-title">Owner access required.</h1>
        <p>This panel is private to the demo owner and staff accounts.</p>
      </div>
    );
  return <AdminPanel role={a.role} />;
}
