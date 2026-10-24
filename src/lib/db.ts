import postgres from 'postgres';
const shared=globalThis as unknown as {rajvyaDb?:ReturnType<typeof postgres>};
export function db(){
 if(!process.env.DATABASE_URL) throw new Error('Database is not configured');
 return shared.rajvyaDb ??= postgres(process.env.DATABASE_URL,{ssl:process.env.DATABASE_SSL==='disable'?false:'require',max:process.env.VERCEL?1:2,prepare:false,connect_timeout:20,idle_timeout:15,transform:{undefined:null}});
}
export function plain<T>(value:T):T { return JSON.parse(JSON.stringify(value)); }
