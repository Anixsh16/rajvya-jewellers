# Evaluation contract

`npm run eval -- --limit 30` runs real Gemini conversations against the demo database. `--offset 30 --limit 30` selects a resumable batch; `--judge` adds a separately configured advisory judge. Results record incomplete scenarios separately from successes and failures. No fake historical scores or business outcomes are seeded.

The dataset contains 40 sales, 25 support, 15 Hinglish and 20 attack cases. Required tools, forbidden tools, strict budgets, purity, catalogue cards and observable database states are checked. Scenario order is interleaved for a representative 30-case subset. Order/refund cases need an owned paid demo order; without it they are incomplete, never automatically passed.

`human-labels.example.jsonl` describes a future 50-conversation review set. Judge calibration remains unverified until actual human labels exist. The judge is advisory, never an authority on money or permissions.

Keyword/vector/hybrid retrieval comparisons are run with `npx tsx scripts/search-eval.ts`. The report distinguishes Hit@5 from Recall@5 and treats failed embeddings as incomplete. All fixtures are illustrative.
