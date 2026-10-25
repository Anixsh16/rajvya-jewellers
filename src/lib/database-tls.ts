import { SUPABASE_DATABASE_CA } from './supabase-ca';
const loopback = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
export function databaseConnection() {
  if (!process.env.DATABASE_URL) throw new Error('Database is not configured');
  const url = new URL(process.env.DATABASE_URL);
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  return url.toString();
}
export function databaseTls() {
  const hostname = new URL(databaseConnection()).hostname;
  if (process.env.DATABASE_SSL === 'disable') {
    if (!loopback.has(hostname))
      throw new Error('TLS may only be disabled for a disposable loopback database');
    return false as const;
  }
  return {
    rejectUnauthorized: true,
    ca:
      process.env.DATABASE_CA_CERT ??
      (hostname.endsWith('.supabase.com') || hostname.endsWith('.supabase.co')
        ? SUPABASE_DATABASE_CA
        : undefined),
  };
}
