import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
import fs from 'node:fs/promises';
async function main() {
  const { db } = await import('../src/lib/db');
  const { refundApprovalState } = await import('../src/lib/agent');
  const [r] =
    await db()`select r.id,r.status,r.decision_by from refunds r join orders o on o.id=r.order_id where not o.internal_only and r.conversation_id is not null order by r.created_at desc limit 1`;
  if (!r) throw new Error('No chat-created test refund');
  const state = await refundApprovalState(r.id);
  const evidence = {
    requestId: r.id,
    status: r.status,
    hasOwnerDecision: !!r.decision_by,
    waitingAfterFreshProcess: state.waiting,
    interruptCount: state.interrupts.length,
  };
  console.log(JSON.stringify(evidence));
  await fs.writeFile('.local/refund-checkpoint-evidence.json', JSON.stringify(evidence, null, 2));
  await db().end();
  process.exit(state.waiting && r.status === 'pending' && !r.decision_by ? 0 : 1);
}
main().catch(() => {
  console.error('Approval checkpoint could not be verified');
  process.exit(1);
});
