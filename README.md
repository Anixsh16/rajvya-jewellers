# Rajvya Jewellers

A jewellery-store portfolio application with a mobile storefront, multi-item cart, daily weight-based pricing, unique-stock checkout, reserve-and-visit, owner operations, AI catalogue intake, photo/text search and a persistent shopping/support assistant.

This is an independent demonstration. Products, policies, tax settings, photographs and appointments are illustrative. Payments use Razorpay test mode. No historical performance or real business impact is claimed.

## Run locally

Use Node.js 22, Python 3.11+, and running Docker Desktop. The local helper creates configuration and disposable accounts automatically; cloud credentials are not needed for offline checks.

```sh
npm ci --legacy-peer-deps
python -m pip install -r requirements-dev.txt
npx supabase start
python scripts/setup-local.py
python scripts/local-app.py
```

The isolated application runs at `http://localhost:3001`. Local account details are in ignored `.local/local-demo-accounts.json`. AI and payment provider calls deliberately stop in this offline environment. Customer demo sign-in creates a separate identity per session; owner credentials stay private. For the existing cloud configuration, `npm run dev` serves port 3000.

See [complete setup and deployment instructions](docs/SETUP.md), [architecture and stack reasons](docs/ARCHITECTURE.md), [reviewer demo](docs/DEMO.md), [measured results and outstanding gates](docs/RESULTS.md), and the [approved illustrated build plan](docs/BUILD_PLAN.md).

Provisioning helpers use `~/.config/rajvya/credentials.json` on the development machine. `scripts/migrate.py` also accepts `DATABASE_URL` from the environment. `scripts/seed.py` provisions demo accounts, 50 products, generated photography, policies and today's demo rates. Its required provisioning fields are documented in `.env.example` and the script. The seed never resets sold inventory. Review every migration before using any existing non-demo database.

## Checks

```sh
npm run typecheck
python scripts/run-local.py test
npm run build
npx playwright install chromium
python scripts/run-local.py browser
node scripts/validate-evals.mjs
python scripts/run-local.py mcp
```

Database integration tests create and remove their own internal product/order fixtures. Run browser and database suites sequentially. Live AI evaluations require an explicit real key and are quota-limited; incomplete runs are not successes. See [the evaluation contract](evals/README.md).

## Architecture and invariants

- Next.js App Router and TypeScript: storefront, dashboard and API adapters share business services.
- Supabase Postgres: versioned rates, integer paise, integer milligrams, immutable quote items, row-locked stock and RLS.
- The SQL pricing function is authoritative for browse filters, quotes and checkout. Vitest checks it against integer arithmetic and the worked example.
- Checkout locks cart products in a stable order. Either every hold is acquired, or no checkout is created. Provider calls occur after the database transaction.
- Provider-captured amount, currency and order identity are verified. A signed browser callback alone is not evidence of payment. Webhooks and reconciliation share the same idempotent handler.
- Late payments reacquire all inventory or enter an exception queue. A captured payment never silently steals another buyer's stock.
- Refund requests require owner approval, stay within remaining captured value, and use a persisted request identity. Uncertain provider responses require reconciliation before retrying. Returned physical stock is reviewed separately.
- Supabase Cron releases expired holds every five minutes; availability and checkout also check expiry directly.
- Gemini tools receive identity from server context. Sales and support use separate allowlists. The model cannot set rates, mark stock sold, execute a refund, or claim a payment.
- Text/image embeddings share a versioned 768-dimensional space. Keyword/vector rankings use reciprocal rank fusion; strict filters are applied before selecting candidates. Failed indexing is visible and retryable.
- LangGraph checkpoints live in the private `agent` schema. Refund approval runs as a separate durable workflow so ordinary conversation can continue while approval waits.
- Structured cards render server-backed prices. Generated monetary prose is rejected before display. The API streams progress and then validated content.

## Owner workflows

`/admin` provides catalogue drafts, photo extraction and review, CSV import, rate history, counter sales, orders, reservations, refunds, human handoffs and evaluation reports. Both weight/purity review and hallmark review must be acknowledged before publication. Model extraction never certifies a field.

CSV headers are demonstrated in `public/sample-catalogue.csv`. Imports stage drafts, report duplicate SKUs and do not overwrite existing live stock.

## MCP

`npm run mcp` starts an owner-only local stdio MCP server using the same service functions. Configure the client's command as `npm`, arguments `run mcp --silent`, and working directory as the repository. The environment must have the local server credentials. Logs go to stderr. Rate and stock changes require explicit confirmation arguments and are audited. Do not distribute this owner configuration to customers. Remote OAuth/MCP hosting is outside this version's agreed transport choice.

## Deployment and operations

Vercel runtime secrets are configured separately from GitHub and Supabase setup tokens. `scripts/provision-deploy.py` uploads tracked application source and starts a production deployment using credentials from the local private configuration. Vercel Hobby is for a personal non-commercial demo; commercial rollout requires a separate hosting review.

Register the final HTTPS `/api/webhooks/razorpay` URL in the Razorpay test dashboard and use exactly the configured `RAZORPAY_WEBHOOK_SECRET`. Subscribe to `payment.captured`, `payment.failed` and `refund.processed`. This dashboard step still requires a human login. Scheduled provider reconciliation is independent of webhooks and uses short-lived signed invocations. `/api/health` checks database connectivity without revealing configuration. The real test refund currently remains uncertain following Razorpay's HTTP 400 response; it has not been reported as successful.

Watch the owner exception queue, pending/uncertain refunds, failed embedding states, cron run history, server errors and AI usage. `ai_usage` tracks model tokens and latency; `audit_log` records owner decisions. Global daily AI and per-user request limits degrade to normal shopping when exhausted.

Rollback application code with a previous Vercel deployment. Schema migrations are additive and recorded; do not reset a live database. Back up database and storage before real-data import. Restore source, migrate a clean dedicated database, seed fixtures, and rerun the test suite to validate recovery.

## Assets and measurement limits

Four original AI-generated photographs live in `public/images`. Catalogue variants reuse these illustrative photographs; they are not claims about actual shop inventory. Design previews are references, not shipped full-page screenshot backgrounds.

No real customer dataset, human judge labels, legal/tax approval or commercial fulfilment is included. The owner dashboard labels simulated activity separately from real business claims. Search metrics use declared synthetic relevance and cannot substantiate the interview guide's original numbers. The free-tier deployment has no production availability guarantee.
