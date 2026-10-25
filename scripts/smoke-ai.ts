import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
async function main() {
  const { db } = await import('../src/lib/db');
  const { chatTurn } = await import('../src/lib/agent');
  const [p] = await db()`select * from profiles where role='customer' order by created_at limit 1`;
  const result = await chatTurn(
    { id: p.id, name: 'Demo customer', role: 'customer' },
    { message: 'Show me simple 18K earrings for daily wear under 25000 rupees.' },
    (s) => console.log(s),
  );
  console.log(
    JSON.stringify({ content: result.content, cards: result.cards.length, tools: result.trace }),
  );
  await db().end();
  process.exit(0);
}
main().catch((e) => {
  console.error('AI smoke failed:', e.message);
  process.exit(1);
});
