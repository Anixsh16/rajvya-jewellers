# Requirement audit — 25 October 2026

Completion is **not yet proven**. The application is deployed and its software checks pass, but external webhook delivery, the fresh live release subset, and the plan's genuine human-review gates remain outstanding. This audit preserves the original scope in [the approved plan](BUILD_PLAN.md).

Verified application source: `034758862b142a1f5d4a801748bfe82bc4c15f15`. [CI evidence](https://github.com/Anixsh16/rajvya-jewellers/actions/runs/40163513519) covers 89 unit/database/replay tests, 18 browser journeys, TypeScript, lint, formatting, evaluation manifest, and production build. The Vercel deployment reached READY; public health, catalogue, owner Auth, calibration set, and storefront rendering were checked against the deployed alias.

Follow-up audit corrections keep unknown extracted purity blank and zero stone charges valid; the expanded owner browser journey corrected and published a zero-stone product and verified retryable indexing failure offline. A separate offline-provider test confirms no model transport call. These follow-up source changes require their own CI run; the linked baseline is not misrepresented as covering later edits.

| Plan requirement | Evidence inspected | Status |
|---|---|---|
| 1: Foundation, formatting, lint, types, environment validation, CI | `package.json`, `scripts/check-env.ts`, pinned Actions workflow; checks passed | Verified; 131 explicit-`any` lint warnings remain, zero errors |
| 1: Fresh local Supabase, versioned migrations, reproducible start/deploy | A fresh hosted runner started Supabase, applied migrations, seeded Auth/Storage/data, ran all browser journeys, and deployed | Verified |
| 1: Customer/staff/owner roles | Verified-user Auth, database roles; customer 401/403 tests and cross-customer reads | Verified |
| 1: Approximately 50 illustrative products/photos/policies | Cloud seed, local seed, four original generated images, 50 indexed sample SKUs; one sold and one reserved by actual test journeys | Verified |
| 1: Acceptance scenarios before AI implementation | Versioned 100-scenario manifest and commerce tests in repository | Artifacts verified; chronology is not claimed |
| 2: Integer prices, weights, percentages and rounding | SQL/BigInt equivalence, fractional weight, fixed/percentage charges, stone/tax boundary tests; ₹44,332.85 worked example | Verified |
| 2: Current-day rates, history, stale-rate rejection, audit | Owner API checks and database immutable-quote/rate tests | Verified |
| 2: Manual catalogue review/publication and counter stock operations | Actual authenticated API review/publication/duplicate import checks; browser review gate; held-stock rejection tests | Verified |
| 3: Responsive catalogue/details/filter/search | Browser journeys include purity/budget, category, exact breakdown and mobile overflow/navigation | Verified |
| 3: Persistent multi-item unique cart and sign-in | Browser duplicate prevention/reload, isolated customer demo identity and owner denial | Verified |
| 4: Immutable 15-minute quote, all-cart holds, sorted locks and idempotency | SQL integration tests; two concurrent HTTP customers produce one complete cart; deterministic expiry/late-payment lock barrier | Verified |
| 4: Callback signature followed by provider state verification | Actual Razorpay test purchase; captured identity, INR and exact amount checked | Verified |
| 4: Signed raw-body webhook, duplicate/out-of-order effects | Forgery tests, duplicate events, signed pre-order rollback/retry test; deployed operator-signed replay of actual captured/refund entities returned 200 twice and tampered bodies 401, with one receipt/no extra effects | Handler verified; **Razorpay-origin delivery awaits dashboard registration** |
| 4: Closed-browser/late capture/reconciliation | Real test reservation browser closed while DB pending; provider captured; next scheduled HTTP invocation created reservation/code/hold; separate late-stock-conflict test | Verified independently of webhook delivery |
| 5: One-piece >₹25,000 reservation, ₹1,000 token, 48-hour hold/code | Actual deployed reservation and account receipt; SQL threshold/hold function | Verified |
| 5: Frozen reservation price/token deduction/counter conversion | Account showed ₹44,332.85 frozen price and ₹43,332.85 balance; database counter conversion preserves snapshot, consumes hold once, rejects a second conversion | Verified; counter collection is explicitly simulated |
| 5: Expiry/cancellation/fulfilment | Created and ready reservation expiry tests queue one unapproved refund; owner/staff fulfilment code and conversion test | Verified |
| 5: Whole/item refunds, rejection, limits, repeated approval and separate restock | Actual full ₹2,523.50 provider refund; two repeat approvals leave one provider refund. Database tests cover item refunds, remaining captured cap, foreign currency review, rejection and physical inspection | Verified; the actual sold piece remains sold |
| 6: Upload/extract/correct/review/publish; Hindi/English text; unknown-field review | Actual Gemini extraction API check, owner publication check; browser photo compression/storage test intercepts only extraction, keeps unknown fields unverified | Verified feature path; extraction was not remeasured with the final primary after daily quota exhaustion |
| 6: Approved-content indexing and visible retry | 50 sample SKUs indexed; model/revision/dimension metadata and owner retry UI inspected | Verified |
| 6: CSV validation/drafts/duplicate protection | Parser tests and actual owner duplicate import without overwrite | Verified |
| 7: Keyword/vector/hybrid, English/Hinglish/photo dataset and strict filters | Actual 65-text/80-total search comparison, category/purity synthetic labels, hard-filter tests | Verified for declared fixtures; not unseen-photo/general-shop accuracy |
| 7: No silent constraint relaxation | Service filters, deterministic budget/purity parser and adversarial quote/reservation replay cases | Verified |
| 8: Single baseline then separate sales/support permissions | Identifiable real baseline 30/30 and routed 100/100 runs; separate allowlists inspected | Verified comparison; no quality uplift claimed |
| 8: Recommendations/matching/quotes/cart/checkout/reservation/policies/order/refund/human actions | Tools reuse shared services, cards have explicit Add-to-bag actions and review links; live multi-turn photo→first-piece quote; live suite and recorded regressions | Verified on measured scenarios; customer click controls payment initiation |
| 8: Ownership on conversations/state/resume and concurrency | Cross-customer conversation HTTP test, server-injected actors, authenticated owner resume, durable conversation lease | Verified; no claim that synthetic attacks exhaust all possible attacks |
| 8: Six tool calls and older-context summary | Runtime tool count/deadline and persisted summary path inspected | Implementation verified; a long-chat live summary was not independently benchmarked |
| 8: Durable refund pause/restart/resume/idempotent effects | Fresh process initially found pending interrupt with no owner decision; later fresh process found processed refund with no pending next node; repeated owner resume produced no duplicate provider refund | Verified |
| 8: Progress stream, validated money, quotas/retries/fallback | SSE code and browser sign-in/error UI, monetary-validation tests, real daily 429, and two tests proving retries count toward the cap | Verified; AI is currently quota-limited |
| 9: Owner stdio MCP tools/shared permissions/confirmation/audit | Real initialize/list/search/summary/unconfirmed-rate protocol smoke; shared pricing/stock functions and five registered tools | Verified agreed stdio transport; no remote MCP endpoint claimed |
| 9: Queues, separate purchase/reservation conversion metrics | Owner browser/API inspection; dashboard SQL separates purchase and reservation conversion counts; processed refund and cron state checked | Verified |
| 10: 100 scenarios (40/25/15/20), live full run | Versioned manifest; 100/100 complete on identified earlier dirty working tree, real provider recordings | Verified historical run; not an exact-final-commit 100-case claim |
| 10: Deterministic and recorded PR/CI regression | 30 real provider tapes plus two labelled scripted constraint cases, 89 total tests in final application-source CI | Verified |
| 10: Fresh 30-case live release subset | Ten passed; first daily-quota 429 stopped further requests; 20 incomplete retained in report/dashboard | **Outstanding after free quota reset** |
| 10: Separate judge calibrated with 50 real human reviews | Fifty advisory model judgments and owner review UI with evidence; database confirms zero human labels | **Outstanding genuine human work** |
| 10: Restart/error/reset/image/secret/RLS hardening | Durable approval recovery, provider uncertainty recovery, fresh runner setup, upload restriction test, secret scans, customer RLS and anonymous mutation denial | Verified within tested cases; no destructive cloud reset performed |
| 10: README/architecture/setup/demo/measurements/limits | Versioned documents, unchanged illustrated approved plan and mockups, aggregate provenance JSON | Verified |
| 10: Supervised review before unrestricted replies | Hosted `assistant_shadow=true`; drafts require owner publication | Mode verified; **supervised human period not complete** |
| Latest UI request: remove the entire top demo banner | Source/CSS absence; local and deployed screenshots show header at top | Verified |

## Remaining concrete actions

1. An authorized human signs into the Razorpay **test** dashboard and registers `https://rajvya-jewellers.vercel.app/api/webhooks/razorpay`, using the already configured webhook secret. Select `payment.captured`, `payment.failed`, `refund.processed`. The secret is in the existing private configuration; it must not be committed. Then test actual provider delivery and duplicate-event handling.
2. After the Gemini project daily quota resets, resume `.local/release-subset-incomplete.json` using the same primary/prompt, and perform the final-primary extraction and long-conversation summary checks. Incomplete results remain incomplete until actual calls finish. Google documents the daily reset at midnight Pacific; no paid quota has been enabled.
3. The owner personally labels the 50 evidence-backed conversations in `/admin` → Evaluations and performs the supervised demo review. Only then measure judge agreement and consider unrestricted assistant replies. The agent cannot create human labels or represent its own review as the owner's.

The public demo remains available for browsing, manual filtering, test checkout and reservations while these gates are open. Scheduled provider verification works; it does not replace the explicitly planned webhook delivery check or human review.
