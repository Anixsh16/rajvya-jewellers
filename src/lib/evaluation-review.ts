import { z } from 'zod';
import { db, plain } from './db';
import { AppError } from './auth';
import type { Actor } from './types';
export const qualitySchema = z.object({
  grounded: z.boolean(),
  helpful: z.boolean(),
  warm: z.boolean(),
  reason: z.string().max(1000),
});
export async function reviewSet() {
  const [run] =
    await db()`select * from eval_results where mode='live-routed-judged' order by created_at desc limit 1`;
  if (!run) return { evaluationId: null, entries: [], reviewed: 0, agreement: null };
  const entries = run.results
    .filter(
      (r: any) =>
        r.status !== 'incomplete' &&
        r.quality?.status === 'complete' &&
        qualitySchema.safeParse(r.quality).success,
    )
    .slice(0, 50);
  const labels = await db()`select * from eval_human_labels where evaluation_id=${run.id}`;
  let compared = 0,
    agreed = 0,
    reviewed = 0;
  const rows = entries.map((r: any) => {
    const label = labels.find((l) => l.scenario_id === r.id);
    if (label) {
      reviewed++;
      for (const key of ['grounded', 'helpful', 'warm']) {
        compared++;
        if (label[key] === r.quality[key]) agreed++;
      }
    }
    return {
      scenarioId: r.id,
      transcript: r.transcript,
      quality: r.quality,
      evidence: r.evidence ?? {},
      label,
    };
  });
  return plain({
    evaluationId: run.id,
    model: run.model,
    promptVersion: run.prompt_version,
    entries: rows,
    reviewed,
    agreement: reviewed === 50 && compared ? agreed / compared : null,
  });
}
export async function saveHumanLabel(
  a: Actor,
  v: {
    evaluationId: string;
    scenarioId: string;
    grounded: boolean;
    helpful: boolean;
    warm: boolean;
    note: string;
    confirmed: boolean;
  },
) {
  if (a.role !== 'owner') throw new AppError('Owner access required', 403);
  if (!v.confirmed) throw new AppError('Personal review confirmation is required', 400);
  const review = await reviewSet();
  if (
    review.evaluationId !== v.evaluationId ||
    !review.entries.some((e: any) => e.scenarioId === v.scenarioId)
  )
    throw new AppError('The review set changed; reload it before labeling', 409);
  await db()`insert into eval_human_labels(evaluation_id,scenario_id,grounded,helpful,warm,note,reviewed_by) values(${v.evaluationId},${v.scenarioId},${v.grounded},${v.helpful},${v.warm},${v.note},${a.id}) on conflict(evaluation_id,scenario_id) do update set grounded=excluded.grounded,helpful=excluded.helpful,warm=excluded.warm,note=excluded.note,reviewed_by=excluded.reviewed_by,reviewed_at=now()`;
  return { ok: true };
}
