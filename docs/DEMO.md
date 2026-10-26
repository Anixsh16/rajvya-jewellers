# Reviewer demo

Start with the public homepage. Filter 18K earrings below ₹25,000, open a product, and compare its exact breakdown with the rounded catalogue card. Add two different pieces to the bag and reload to demonstrate persistence and unique-piece quantities.

Use a fresh demo customer identity. Review an immutable quote and continue only through Razorpay **test** checkout. The local emulator deliberately stops before a real provider call; use the hosted demo for an actual test payment. Inspect the resulting account order and payment state. Closing the browser should not establish or erase payment: signed events or scheduled provider lookup establish it.

For reserve-and-visit, select a live piece above ₹25,000, choose a simulated visit in the next 48 hours, and review the ₹1,000 test token. A captured token produces a reservation code and a frozen balance. An owner/staff session can look up that code and record counter conversion or cancellation.

In `/admin`, privately sign in as the owner. Inspect rates/history, catalogue drafts, purchase/reservation counts, and exception queues. Upload a photo with a tag, correct extraction fields, acknowledge financial and hallmark checks, and publish. Try a duplicate SKU CSV row to demonstrate that live data is not overwritten. Retry a failed embedding from its visible status.

Open the assistant with a customer identity. Ask for a strict-budget recommendation, a matching piece, and a quote for the first result. Try Hinglish and a reference photo. Ask a policy question, inspect your own order, request a refund, and request a human. In review mode the owner must approve the draft before it appears. A customer cannot approve refunds, change rates, or read another customer's order/conversation.

For refunds, demonstrate the owner decision and persisted approval workflow. A database test covers item limits, repeated events, uncertainty, and separate restock review. The actual test purchase has a provider-processed full refund; repeated approval created no duplicate. Its item deliberately remains sold until an owner records physical inspection. If demonstrating another refund, inspect current provider status and balance before a retry; never present an uncertain outcome as success.

Run `python scripts/run-local.py mcp` for an actual MCP initialization/tool-list/search/summary/confirmation protocol check. Connect `npm run mcp --silent` from a trusted local MCP client for interactive owner use.

Finish in Evaluations. Compare live and replay evidence and explain the synthetic dataset limits. The fresh 30-case release run and actual provider-origin webhook delivery passed. On 26 October 2026 the owner made personal calibration and supervised demo review optional; direct replies are enabled and judge scores remain advisory. The 50-conversation human review set is available for optional calibration, as documented in [RESULTS.md](RESULTS.md).
