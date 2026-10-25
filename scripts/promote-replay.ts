import fs from 'node:fs/promises';
async function main() {
  const tape = JSON.parse(await fs.readFile('.local/latest-replay-recordings.json', 'utf8'));
  const expected = JSON.parse(await fs.readFile('evals/scenarios.json', 'utf8'))
    .slice(0, 30)
    .map((s: any) => s.id);
  tape.recordings = tape.recordings.filter((r: any) => expected.includes(r.scenarioId));
  if (
    tape.mode !== 'routed' ||
    expected.some((id: string) => !tape.recordings.some((r: any) => r.scenarioId === id))
  )
    throw new Error('All 30 routed scenarios must have recordings');
  const report = JSON.parse(await fs.readFile('.local/latest-eval.json', 'utf8'));
  const cfg = JSON.parse(await fs.readFile('.local/local-credentials.json', 'utf8'));
  if (!['localhost', '127.0.0.1', '::1'].includes(new URL(cfg.DATABASE_URL).hostname))
    throw new Error('Recording promotion is local only');
  process.env.DATABASE_URL = cfg.DATABASE_URL;
  process.env.DATABASE_SSL = 'disable';
  const { db } = await import('../src/lib/db');
  for (const turn of tape.recordings) {
    const result = report.results.find((r: any) => r.id === turn.scenarioId && r.status === 'pass');
    if (!result) throw new Error('A passing live result is required for each recording');
    const messages =
      await db()`select cards from messages where conversation_id=${result.conversationId} and role='assistant' order by created_at`;
    const cards = messages[turn.turn]?.cards ?? [];
    const ids = cards.map((c: any) => c.id);
    turn.observedSkus = ids.length
      ? (await db()`select sku from products where id=any(${db().array(ids)}::uuid[])`).map(
          (p) => p.sku,
        )
      : [];
  }
  const products =
    await db()`select id,sku,name,description,description_hi,category,purity,net_mg,gross_mg,making_bps,making_fixed_paise,stone_paise,huid,tags,image_url,status,review_confirmed from products where not internal_only order by sku`;
  const policies = await db()`select title,content from policies order by title`;
  await fs.writeFile(
    'evals/replay-fixtures.json',
    JSON.stringify({ products, policies }, null, 2) + '\n',
  );
  const text = JSON.stringify(
    {
      ...tape,
      scope:
        'Recorded provider responses for orchestration regression; not a live model quality measurement.',
    },
    null,
    2,
  );
  await fs.writeFile('evals/replays.json', text + '\n');
  await db().end();
  console.log(
    'Promoted 30 synthetic conversation recordings and their observed catalogue candidates. Run replay tests before committing.',
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
