import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
import fs from 'node:fs/promises';
process.env.AI_EVALUATION = '1';
async function main() {
  const { db } = await import('../src/lib/db');
  const { hybridSearch, embed } = await import('../src/lib/ai');
  const items =
    await db()`select id,sku,name,category,purity,image_url from catalogue where availability='live' and price is not null order by sku`;
  const photos = new Map<string, { data: string; mimeType: string }>(),
    vectors = new Map<string, number[]>();
  const cases: any[] = [];
  const english = [
    ['simple daily earrings', 'Earrings', null],
    ['gold pendant chain', 'Chains', '22K'],
    ['sterling silver ring', 'Rings', '925'],
    ['floral office studs in 18K', 'Earrings', '18K'],
    ['minimal everyday chain', 'Chains', '22K'],
    ['classic silver band', 'Rings', '925'],
    ['small 18K gold earrings', 'Earrings', '18K'],
    ['gift gold chain', 'Chains', '22K'],
  ];
  const englishEnds = [
    ' for everyday wear',
    ' as a birthday gift',
    ' with a quiet polished finish',
    ' for an anniversary',
    ' for a minimal look',
  ];
  const hinglish = [
    ['halka daily earrings', 'Earrings', null],
    ['roz silver ring', 'Rings', '925'],
    ['simple gold chain', 'Chains', '22K'],
    ['office ke liye 18K earrings', 'Earrings', '18K'],
    ['gift silver band', 'Rings', '925'],
  ];
  const hindiEnds = [' dikhao', ' pasand hai', ' chahiye', ' options batao', ' suggest karo'];
  for (let i = 0; i < 40; i++) {
    const [query, category, purity] = english[i % 8];
    cases.push({
      id: 'english-' + (i + 1),
      query: query + englishEnds[Math.floor(i / 8)],
      category,
      purity,
    });
  }
  for (let i = 0; i < 25; i++) {
    const [query, category, purity] = hinglish[i % 5];
    cases.push({
      id: 'hinglish-' + (i + 1),
      query: query + hindiEnds[Math.floor(i / 5)],
      category,
      purity,
    });
  }
  for (let i = 0; i < 15; i++) {
    const p = items[i % items.length];
    cases.push({
      id: 'photo-' + (i + 1),
      query: 'Photo similarity',
      category: p.category,
      purity: null,
      imageUrl: p.image_url,
    });
  }
  const results: any[] = [];
  await fs.mkdir('.local', { recursive: true });
  const report = () => ({
    metrics: Object.fromEntries(
      ['keyword', 'vector', 'hybrid'].map((method) => {
        const all = results.filter((r) => r.method === method),
          done = all.filter((r) => r.status === 'complete');
        return [
          method,
          {
            completed: done.length,
            requested: all.length,
            hitAt5: done.length ? done.filter((r) => r.hit5).length / done.length : null,
            recallAt5: done.length ? done.reduce((n, r) => n + r.recall5, 0) / done.length : null,
            precisionAt5: done.length
              ? done.reduce((n, r) => n + r.precision5, 0) / done.length
              : null,
          },
        ];
      }),
    ),
    cases,
    results,
    labels:
      'Predeclared category and explicit purity labels on synthetic queries; not human judgments.',
    photoLimitation:
      '15 photo cases reuse three generated catalogue photographs. No unseen-photo generalization is measured.',
  });
  for (const c of cases) {
    const relevant = items
      .filter((p) => p.category === c.category && (!c.purity || p.purity === c.purity))
      .map((p) => p.id);
    let image;
    let vector: number[] | undefined;
    let vectorFailed = false;
    try {
      const key = c.imageUrl ?? c.query;
      if (c.imageUrl) {
        if (!photos.has(c.imageUrl)) {
          const r = await fetch(c.imageUrl, { signal: AbortSignal.timeout(20000) });
          if (!r.ok) throw new Error('Photo unavailable');
          photos.set(c.imageUrl, {
            data: Buffer.from(await r.arrayBuffer()).toString('base64'),
            mimeType: r.headers.get('content-type') ?? 'image/png',
          });
        }
        image = photos.get(c.imageUrl);
      }
      if (!vectors.has(key)) vectors.set(key, await embed(c.query, image));
      vector = vectors.get(key);
    } catch {
      vectorFailed = true;
    }
    for (const method of ['keyword', 'vector', 'hybrid'] as const) {
      if (c.imageUrl && method === 'keyword') continue;
      if (method !== 'keyword' && vectorFailed) {
        results.push({ id: c.id, method, status: 'incomplete', reason: 'Embedding unavailable' });
        continue;
      }
      try {
        const found = await hybridSearch(c.query, {
          method,
          image,
          queryVector: vector,
          requireVector: method !== 'keyword',
        });
        const top = found.slice(0, 5).map((p) => p.id),
          hits = top.filter((id) => relevant.includes(id)).length;
        results.push({
          id: c.id,
          method,
          top,
          relevantCount: relevant.length,
          hit5: hits > 0,
          recall5: relevant.length ? hits / relevant.length : 0,
          precision5: hits / 5,
          status: 'complete',
        });
      } catch {
        results.push({ id: c.id, method, status: 'incomplete', reason: 'Retrieval unavailable' });
      }
    }
    await fs.writeFile('.local/search-eval.json', JSON.stringify(report(), null, 2));
    console.log('Search case', c.id);
    await new Promise((r) => setTimeout(r, 1500));
  }
  const final = report();
  console.log(JSON.stringify(final.metrics));
  await db().end();
  process.exit(final.results.some((r) => r.status === 'incomplete') ? 1 : 0);
}
main().catch(() => {
  console.error('Search evaluation incomplete');
  process.exit(1);
});
