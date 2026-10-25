# Measured results and remaining release gates

These are portfolio measurements on synthetic fixtures, not historical shop outcomes. [Aggregate run metadata](measurements.json) identifies the model, prompt, dataset, source commit, dirty working tree, and environment. Raw run files stay under ignored `.local/`; the owner dashboard contains the synthetic transcripts and judge evidence.

| Check | Observed result | Meaning and limits |
|---|---|---|
| Live routed suite | 100/100 completed and passed; 20 attack scenarios without a successful authorization/payment-integrity violation | Real Gemini 3.5 Flash-Lite calls and local Supabase. A resumed run combined completed cases from two quota-paced batches. Synthetic, bounded scenarios; not an exhaustive security proof. |
| Single-agent baseline | 30/30 completed and passed | Same representative subset. No observed quality improvement over baseline is claimed. Routing narrows tool permissions. |
| Separate quality judge | 50/50 judged | Same model family, separate pass with reference evidence. **Zero real human labels; uncalibrated and advisory.** |
| Keyword retrieval | Hit@5 100% over 65 text cases; Recall@5 34.93% | Declared synthetic category/purity relevance. |
| Vector retrieval | Hit@5 100% over 80 cases; Recall@5 35.07% | Includes 15 photo cases repeating three generated catalogue images. |
| Hybrid retrieval | Hit@5 100% over 80 cases; Recall@5 34.66% | This benchmark does not demonstrate an advantage over vector retrieval or generalization to unseen photos. |
| Recorded regression | 30 real provider-response tapes plus two explicitly scripted constraint cases | Offline CI regression, not fresh model-quality evidence. |
| Real provider purchase | One Razorpay test netbanking purchase captured and verified for exact amount/currency | A provider-backed test transaction, distinct from synthetic database transition tests. |
| Live photo follow-up | Photo search returned constrained catalogue cards; “quote the first piece” created the matching quote | Verified no inventory hold and no image bytes in persisted checkpoints. |

Hit@5 asks whether any labelled relevant product appears in the first five. Recall@5 measures how much of the full relevant set appears there; a low Recall@5 is possible when many products share the category. These labels are deliberately broad. Neither metric reproduces the interview guide's historical numbers.

The 100-case suite was measured on a dirty working tree based on commit `7b68b342ef21adfb20f45307b0b18bfaf4642525`, before subsequent hardening. It is not evidence that all 100 cases ran against the final production commit. Final local checks, replay CI, the release subset, and deployment smoke must be recorded separately. Token counts in older runs omit some provider thinking tokens, so paid-equivalent costs would be incomplete; actual billing totals are unavailable. No paid fallback was configured and no monetary savings or business conversions are claimed.

## Outstanding gates

1. Register the deployed webhook in the Razorpay **test dashboard**. The dashboard currently requires a human login; the provided API keys do not establish that browser session. The signed endpoint and provider reconciliation can be tested independently, but webhook delivery remains unverified until registration.
2. Resolve the real Razorpay test refund error. A verified captured test payment was submitted through the documented refund flow; Razorpay returned HTTP 400 `BAD_REQUEST_ERROR` (“invalid request sent”). The request remains uncertain, with no provider refund found. Do not claim a successful external refund or restock its sold item.
3. Personally review the 50-conversation judge set and conduct the supervised demo period. `/admin` → Evaluations provides the labels and computes agreement only after all 50 are saved. Automated labels must not be substituted for this human work. Keep public replies in review mode until the owner completes that gate.

The application is restricted to a personal, illustrative portfolio: sample stock and policies, simulated visits/fulfilment, and test payments. Real tax/legal policy, commercial hosting eligibility, licensed shop data, delivery, and operational ownership require a separate launch decision.
