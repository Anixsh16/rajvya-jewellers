import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
async function main() {
  const { db } = await import('../src/lib/db');
  const { indexProduct } = await import('../src/lib/ai');
  const products =
    await db()`select id,sku from products where status='live' and not internal_only and (embedding_status<>'ready' or embedding_model<>${process.env.EMBEDDING_MODEL ?? 'gemini-embedding-2'} or embedding_revision<>1) order by sku`;
  for (const p of products) {
    try {
      await indexProduct(p.id);
      console.log('Indexed', p.sku);
    } catch {
      console.log('Index failed; will retry', p.sku);
    }
    await new Promise((r) => setTimeout(r, 4500));
  }
  await db().end();
}
main().catch(() => {
  console.error('Indexing stopped');
  process.exit(1);
});
