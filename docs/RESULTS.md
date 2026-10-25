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
| Deployed webhook handler | Operator-signed replays of actual test payment/refund entities returned 200 twice; altered raw bodies returned 401. The test dashboard endpoint is now registered and enabled. | Actual Razorpay requests reached the endpoint, but request logs show HTTP 401 with `Razorpay-Webhook/v1`; the saved secret does not match the app. **Accepted provider-origin delivery remains outstanding.** |
| Live photo follow-up | Photo search returned constrained catalogue cards; “quote the first piece” created the matching quote | Verified no inventory hold and no image bytes in persisted checkpoints. |
| Fresh release subset | 10/30 completed and passed; 20 incomplete after daily free quota exhaustion | Run `2026-10-25T04-48-09.936Z`, source `3eb045d64956979f4d1cae101cefe4d0d710e04f`. The first provider HTTP 429 stopped further calls. This is **not** a passing 30-case release gate. |
| Release verification | 91 automated tests and 18 browser journeys passed in GitHub CI; type, lint, formatting, manifest, and production build passed | [Verified workflow](https://github.com/Anixsh16/rajvya-jewellers/actions/runs/40166463446), application source `c15bb0c269d438af61d47c5472abdd4afa3bf79f`; deployed READY and public health passed. Lint reports 131 `any` typing warnings, zero errors. |

Hit@5 asks whether any labelled relevant product appears in the first five. Recall@5 measures how much of the full relevant set appears there; a low Recall@5 is possible when many products share the category. These labels are deliberately broad. Neither metric reproduces the interview guide's historical numbers.

The 100-case suite was measured on a dirty working tree based on commit `7b68b342ef21adfb20f45307b0b18bfaf4642525`, before subsequent hardening. It is not evidence that all 100 cases ran against the final production commit. Final local checks, replay CI, the release subset, and deployment smoke must be recorded separately. Token counts in older runs omit some provider thinking tokens, so paid-equivalent costs would be incomplete; actual billing totals are unavailable. No paid fallback was configured and no monetary savings or business conversions are claimed.

## Outstanding gates

1. Correct the webhook secret in the Razorpay **test dashboard** to match the application. Login and endpoint registration are complete. Actual provider requests currently fail signature validation with HTTP 401; successful authenticated provider delivery must be verified after the human completes the credential change.
2. Personally review the 50-conversation judge set and conduct the supervised demo period. `/admin` → Evaluations provides the labels and computes agreement only after all 50 are saved. Automated labels must not be substituted for this human work. Public replies are in review mode until the owner completes that gate.
3. Resume the fresh 30-case release subset after the provider's daily free quota resets. The previous complete 100-case run remains valid evidence for its identified source; it cannot replace this incomplete release run. Do not switch to paid billing or fabricate the remaining results.

The application is restricted to a personal, illustrative portfolio: sample stock and policies, simulated visits/fulfilment, and test payments. Real tax/legal policy, commercial hosting eligibility, licensed shop data, delivery, and operational ownership require a separate launch decision.
