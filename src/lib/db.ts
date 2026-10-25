import postgres from 'postgres';
import { databaseConnection, databaseTls } from './database-tls';
const shared = globalThis as unknown as { rajvyaDb?: ReturnType<typeof postgres> };
export function db() {
  if (!process.env.DATABASE_URL) throw new Error('Database is not configured');
  return (shared.rajvyaDb ??= postgres(databaseConnection(), {
    ssl: databaseTls(),
    max: process.env.VERCEL ? 1 : 2,
    prepare: false,
    connect_timeout: 20,
    idle_timeout: 15,
    transform: { undefined: null },
  }));
}
export function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
