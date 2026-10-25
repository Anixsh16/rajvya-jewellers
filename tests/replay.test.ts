import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import { GenerateContentResponse } from '@google/genai';
import { db } from '../src/lib/db';
import * as ai from '../src/lib/ai';
import * as payments from '../src/lib/payments';
import { chatTurn, validateMoneyText, PROMPT_VERSION } from '../src/lib/agent';
const local =
  !!process.env.DATABASE_URL &&
  ['localhost', '127.0.0.1', '::1'].includes(new URL(process.env.DATABASE_URL).hostname);
const path = 'evals/replays.json';
const replay = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, 'utf8')) : undefined;
const scenarios = JSON.parse(fs.readFileSync('evals/scenarios.json', 'utf8'));
describe.skipIf(!local || !replay)('recorded Gemini transport with real services', () => {
  let actor: { id: string; name: string; role: 'customer' };
  const conversations: string[] = [];
  const ids: string[] = [];
  const policyTitles: string[] = [];
  const sql = db();
  let tape: any[] = [];
  let candidates: string[] = [];
  beforeAll(async () => {
    expect(replay.promptVersion).toBe(PROMPT_VERSION);
    expect(new Set(replay.recordings.map((r: any) => r.scenarioId)).size).toBe(30);
    await sql`create schema if not exists agent`;
    const [p] =
      await sql`select id from profiles where role='customer' order by created_at limit 1`;
    actor = { id: p.id, name: 'Replay fixture', role: 'customer' };
    const fixture = JSON.parse(fs.readFileSync('evals/replay-fixtures.json', 'utf8'));
    for (const p of fixture.products) {
      const inserted =
        await sql`insert into products ${sql(p)} on conflict(sku) do nothing returning id`;
      ids.push(...inserted.map((p) => p.id));
    }
    for (const p of fixture.policies) {
      const inserted =
        await sql`insert into policies ${sql(p)} on conflict(title) do nothing returning title`;
      policyTitles.push(...inserted.map((p) => p.title));
    }
    vi.spyOn(ai.gemini().models, 'generateContent').mockImplementation(async () => {
      const next = tape.shift();
      if (!next) throw new Error('Recorded response tape exhausted');
      return Object.assign(new GenerateContentResponse(), next);
    });
    // Relevance is measured separately with the live search benchmark. Here real
    // SQL filtering/pricing/ownership stay active while the provider is offline.
    vi.spyOn(ai, 'hybridSearch').mockImplementation(async (_query, filters = {}) =>
      JSON.parse(
        JSON.stringify(
          await sql`select * from catalogue where sku=any(${sql.array(candidates)}::text[]) and availability='live' and price is not null and (${filters.maxPaise ?? 0}=0 or (price->>'totalPaise')::bigint<=${filters.maxPaise ?? 0}) and (${filters.purity ?? ''}='' or purity=${filters.purity ?? ''}) and (${filters.category ?? ''}='' or category=${filters.category ?? ''}) order by sku`,
        ),
      ),
    );
    vi.spyOn(payments, 'razor').mockImplementation(async () => {
      throw new Error('Replay must never contact the payment provider');
    });
  });
  for (const scenario of scenarios.slice(0, 30))
    it(scenario.id, async () => {
      const turns = replay.recordings
        .filter((r: any) => r.scenarioId === scenario.id)
        .sort((a: any, b: any) => a.turn - b.turn);
      expect(turns.length).toBeGreaterThan(0);
      let cid: string | undefined;
      const traces: any[] = [];
      const cards: any[] = [];
      for (const turn of turns) {
        tape = [...turn.outputs];
        candidates = turn.observedSkus;
        const response = await chatTurn(
          actor,
          { message: turn.input, conversationId: cid },
          () => {},
        );
        cid = response.conversationId!;
        if (!conversations.includes(cid!)) conversations.push(cid!);
        traces.push(...response.trace);
        cards.push(...response.cards);
        expect(validateMoneyText(response.content)).toBe(true);
        expect(response.trace.length).toBeLessThanOrEqual(6);
        expect(tape).toHaveLength(0);
      }
      const used = traces.filter((t) => t.ok).map((t) => t.tool);
      for (const tool of scenario.requiredTools) expect(used).toContain(tool);
      for (const tool of scenario.forbiddenTools) expect(used).not.toContain(tool);
      if (scenario.expectCards) expect(cards.length).toBeGreaterThan(0);
      if (scenario.budgetPaise)
        expect(cards.every((c) => c.totalPaise <= scenario.budgetPaise)).toBe(true);
      if (scenario.purity) expect(cards.every((c) => c.purity === scenario.purity)).toBe(true);
      expect(payments.razor).not.toHaveBeenCalled();
    });
  it('a model-selected quote cannot exceed the customer’s budget', async () => {
    const [piece] =
      await sql`select id from catalogue where category='Chains' and availability='live' order by sku limit 1`;
    const response = (parts: unknown[]) => ({
      candidates: [{ content: { role: 'model', parts } }],
    });
    tape = [
      response([{ text: 'sales' }]),
      response([{ functionCall: { name: 'get_quote', args: { productIds: [piece.id] } } }]),
      response([
        { text: 'That piece is outside your budget. I can help you find a suitable alternative.' },
      ]),
    ];
    const result = await chatTurn(
      actor,
      { message: 'Only 22K jewellery under 10000 rupees. Quote product ' + piece.id },
      () => {},
    );
    conversations.push(result.conversationId!);
    expect(result.cards).toHaveLength(0);
    expect(result.link).toBeUndefined();
    expect(result.trace).toContainEqual({ tool: 'get_quote', ok: false });
    expect(payments.razor).not.toHaveBeenCalled();
  });
  it('a reservation cannot silently bypass an earlier budget', async () => {
    const [piece] =
      await sql`select id from catalogue where category='Chains' and availability='live' order by sku limit 1`;
    const response = (parts: unknown[]) => ({
      candidates: [{ content: { role: 'model', parts } }],
    });
    tape = [
      response([{ text: 'sales' }]),
      response([{ functionCall: { name: 'create_reservation', args: { productId: piece.id } } }]),
      response([
        { text: 'This piece is outside your confirmed budget. Please choose a matching piece.' },
      ]),
    ];
    const result = await chatTurn(
      actor,
      { message: 'My budget is 20000 rupees. Reserve product ' + piece.id },
      () => {},
    );
    conversations.push(result.conversationId!);
    expect(result.cards).toHaveLength(0);
    expect(result.link).toBeUndefined();
    expect(result.trace).toContainEqual({ tool: 'create_reservation', ok: false });
    expect(payments.razor).not.toHaveBeenCalled();
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    if (conversations.length) {
      await sql`delete from ai_usage where conversation_id=any(${sql.array(conversations)}::uuid[])`;
      await sql`delete from conversations where id=any(${sql.array(conversations)}::uuid[])`;
    }
    for (const id of ids) {
      await sql`delete from quotes where id in(select quote_id from quote_items where product_id=${id})`;
      await sql`delete from products where id=${id}`;
    }
    if (policyTitles.length)
      await sql`delete from policies where title=any(${sql.array(policyTitles)}::text[])`;
    await sql.end();
  });
  it('an old budget outside the model window still blocks an over-budget reservation', async () => {
    const [piece] =
      await sql`select id from catalogue where category='Chains' and availability='live' order by sku limit 1`;
    const [c] =
      await sql`insert into conversations(customer_id,internal_only) values(${actor.id},true) returning id`;
    conversations.push(c.id);
    await sql`insert into messages(conversation_id,role,content,created_at) values(${c.id},'user','Only 22K pieces under 20000 rupees.',now()-interval '2 minutes'),(${c.id},'assistant','I will keep those preferences.',now()-interval '2 minutes')`;
    for (let i = 0; i < 11; i++)
      await sql`insert into messages(conversation_id,role,content,created_at) values(${c.id},'user','Please explain the return policy.',now()-interval '1 minute'+${i}*interval '1 second'),(${c.id},'assistant','These are illustrative demo policies.',now()-interval '1 minute'+${i}*interval '1 second')`;
    const response = (parts: unknown[]) => ({
      candidates: [{ content: { role: 'model', parts } }],
    });
    tape = [
      response([{ text: 'sales' }]),
      response([{ functionCall: { name: 'create_reservation', args: { productId: piece.id } } }]),
      response([{ text: 'This piece is outside your confirmed budget.' }]),
    ];
    const result = await chatTurn(
      actor,
      { conversationId: c.id, message: 'Reserve this piece: ' + piece.id },
      () => {},
    );
    expect(result.cards).toHaveLength(0);
    expect(result.link).toBeUndefined();
    expect(result.trace).toContainEqual({ tool: 'create_reservation', ok: false });
    expect(payments.razor).not.toHaveBeenCalled();
  });
});
