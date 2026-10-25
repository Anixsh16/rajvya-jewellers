import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import { chatTurn } from '../src/lib/agent';
import { evaluationActor } from './eval-fixtures';
process.env.AI_EVALUATION = '1';
async function main() {
  if (!['localhost', '127.0.0.1', '::1'].includes(new URL(process.env.DATABASE_URL!).hostname))
    throw new Error('Use the disposable local stack.');
  const actor = await evaluationActor('photo-followup');
  const data = (await fs.readFile('public/images/earrings.png')).toString('base64');
  const first = await chatTurn(
    actor,
    {
      message:
        'Find simple 18K earrings like this photo for daily wear, strictly under 30000 rupees.',
      image: { data, mimeType: 'image/png' },
    },
    (s) => console.log(s),
  );
  await db()`update conversations set internal_only=true where id=${first.conversationId}`;
  assert(first.cards.length > 0, 'Photo search must return catalogue cards');
  assert(first.cards.every((c: any) => c.totalPaise <= 3000000 && c.purity === '18K'));
  const second = await chatTurn(
    actor,
    {
      conversationId: first.conversationId,
      message: 'Please quote only the first piece you just showed me.',
    },
    (s) => console.log(s),
  );
  assert(second.link?.startsWith('/cart?quote='), 'Follow-up must return a real quote');
  const quoteId = new URL(second.link!, 'https://fixture.invalid').searchParams.get('quote');
  const items = await db()`select product_id from quote_items where quote_id=${quoteId}`;
  assert.equal(items.length, 1);
  assert.equal(items[0].product_id, first.cards[0].id);
  const blobs =
    await db()`select channel,blob from agent.checkpoint_blobs where thread_id=${first.conversationId}`;
  assert(
    blobs.every(
      (b) =>
        b.channel !== 'image' &&
        !Buffer.from(b.blob ?? []).includes(Buffer.from(data.slice(0, 1000))),
    ),
    'Photo bytes must not enter checkpoints',
  );
  const holds =
    await db()`select 1 from holds where order_id in(select id from orders where customer_id=${actor.id})`;
  assert.equal(holds.length, 0, 'Quote review must not hold stock');
  await fs.writeFile(
    '.local/photo-followup-evidence.json',
    JSON.stringify(
      {
        model: process.env.GEMINI_MODEL,
        conversationId: first.conversationId,
        photoCards: first.cards.length,
        quoteFirstCard: true,
        checkpointContainsPhoto: false,
        noHolds: true,
        trace: second.trace,
      },
      null,
      2,
    ),
  );
  console.log(
    'PASS: live photo search, first-piece follow-up, real quote, private checkpoint, no holds.',
  );
  await db().end();
  process.exit(0);
}
main().catch((e) => {
  console.error('Photo follow-up smoke failed:', e.message);
  process.exit(1);
});
