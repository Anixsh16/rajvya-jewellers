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
| Recorded regression | 30 real provider-response tapes plus three explicitly scripted constraint cases | Offline CI regression, not fresh model-quality evidence. Includes original limits outside the model's bounded message window. |
| Real provider purchase | One Razorpay test netbanking purchase captured and verified for exact amount/currency | A provider-backed test transaction, distinct from synthetic database transition tests. |
| Closed-browser reservation | ₹1,000 test token captured; the next scheduled provider lookup created the reservation and 48-hour hold | Checkout browser closed while the database was still pending. No browser callback or manual reconciliation was used. The account showed the frozen ₹44,332.85 price and ₹43,332.85 counter balance. |
| Real provider refund | Full ₹2,523.50 test refund processed; two repeated approval requests left exactly one provider refund | An initial HTTP 400 was preserved as uncertain. After the new test capture, a verified retry of the same approved request succeeded. Stock remains sold pending physical inspection. |
| Deployed webhook handler | Actual Razorpay-origin failed-payment notification returned HTTP 200 after the owner corrected the saved secret; one receipt committed and the order remained unpaid. | Provider user-agent request logs correlate with event `Ts3DRHyTeso0sb`. Capture/refund duplicate effects are separately covered by operator-signed real-entity replays and database tests. Earlier mismatched-secret requests correctly returned 401. |
| Live photo follow-up | Photo search returned constrained catalogue cards; “quote the first piece” created the matching quote | Verified no inventory hold and no image bytes in persisted checkpoints. |
| Fresh release evaluation | 30/30 completed and passed, including seven attack scenarios; no recorded integrity/authorization failures | Run `2026-10-25T07-11-34.781Z`, clean source `3f12b5b92c4ae33112e0747575b2a46eed25cd3b`, same primary/prompt, no resumed cases. 109,567 input tokens, 4,515 output/thinking tokens, 414,174 ms including quota pacing. Actual billed spend is unavailable; no paid fallback was configured. |
| Historical incomplete subset | 10/30 completed; 20 incomplete after daily free quota exhaustion | Run `2026-10-25T04-48-09.936Z`, source `3eb045d64956979f4d1cae101cefe4d0d710e04f`. Preserved separately; none of its cases were counted in the fresh passing release run. |
| Final-primary photo extraction | Deployed route returned a bilingual draft; untagged purity, net/gross weight and HUID stayed null | A prior HTTP request returned 500. A provider availability probe, direct extraction check, and controlled deployed retry subsequently passed. The original failure's exact cause is unproven; no code fix is claimed. |
| Older-context summary and restart | Live summary retained original 18K/strict-under-₹30,000 preferences; a fresh process returned three matching cards and no holds | Declared fixture: 28 synthetic history messages followed by two actual model turns. Source `3f12b5b92c4ae33112e0747575b2a46eed25cd3b`; this verifies the summary/restart path, not general long-conversation quality. |
| Release verification | 91 automated tests and 18 browser journeys passed in GitHub CI; type, lint, formatting, manifest, and production build passed | [Verified workflow](https://github.com/Anixsh16/rajvya-jewellers/actions/runs/40169757292), source `3f12b5b92c4ae33112e0747575b2a46eed25cd3b`; deployed READY, extraction and provider-origin webhook checks passed. Lint reports 131 `any` typing warnings, zero errors. |

Hit@5 asks whether any labelled relevant product appears in the first five. Recall@5 measures how much of the full relevant set appears there; a low Recall@5 is possible when many products share the category. These labels are deliberately broad. Neither metric reproduces the interview guide's historical numbers.

The 100-case suite was measured on a dirty working tree based on commit `7b68b342ef21adfb20f45307b0b18bfaf4642525`, before subsequent hardening. It is not evidence that all 100 cases ran against the final production commit. Final local checks, replay CI, the release subset, and deployment smoke must be recorded separately. Token counts in older runs omit some provider thinking tokens, so paid-equivalent costs would be incomplete; actual billing totals are unavailable. No paid fallback was configured and no monetary savings or business conversions are claimed.

## Outstanding gates

1. Personally review the 50-conversation judge set. `/admin` → Evaluations provides the source conversations/reference evidence and computes agreement only after all 50 are saved. Automated labels must not be substituted for this human work.
2. Conduct the supervised demo review before enabling unrestricted assistant replies. The public assistant remains in owner review mode while these human requirements are open.

The application is restricted to a personal, illustrative portfolio: sample stock and policies, simulated visits/fulfilment, and test payments. Real tax/legal policy, commercial hosting eligibility, licensed shop data, delivery, and operational ownership require a separate launch decision.
