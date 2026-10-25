import { sessionClient } from './supabase';
import { db } from './db';
import type { Actor } from './types';
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function actor(required = true): Promise<Actor | null> {
  const s = await sessionClient();
  const {
    data: { user },
  } = await s.auth.getUser();
  if (!user) {
    if (required) throw new AppError('Please sign in to continue', 401);
    return null;
  }
  const [p] = await db()`select name,role from profiles where id=${user.id}`;
  return {
    id: user.id,
    email: user.email,
    name: p?.name ?? 'Customer',
    role: p?.role ?? 'customer',
  };
}
export async function staff(ownerOnly = false) {
  const a = (await actor())!;
  if (ownerOnly ? a.role !== 'owner' : a.role === 'customer')
    throw new AppError('You do not have permission for this action', 403);
  return a;
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  const host =
    req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host;
  if (origin && new URL(origin).host !== host)
    throw new AppError('Cross-origin request rejected', 403);
}
export function failure(e: unknown) {
  if (e instanceof AppError) return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof Error && e.name === 'ZodError')
    return Response.json({ error: 'Please check the supplied fields' }, { status: 400 });
  const pg = e as { code?: string; message?: string };
  if (pg.code === 'P0001') return Response.json({ error: pg.message }, { status: 409 });
  console.error('Request failed', { type: e instanceof Error ? e.name : 'Unknown', code: pg.code });
  return Response.json(
    { error: 'This request could not be completed. Please try again.' },
    { status: 500 },
  );
}
