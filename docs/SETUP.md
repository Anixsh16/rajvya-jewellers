# Setup and reproduction

Use Node 22, Python 3.11+, Docker Desktop (running), and Git. The lockfile pins the installed JavaScript dependency graph. Install with `npm ci --legacy-peer-deps`; the flag avoids an npm peer-resolution issue with the current dependencies.

## Disposable local environment

```sh
npm ci --legacy-peer-deps
python -m pip install -r requirements-dev.txt
npx supabase start
python scripts/setup-local.py
python scripts/local-app.py
```

Open `http://localhost:3001`. Supabase runs at `http://127.0.0.1:54321`; Studio is at `http://127.0.0.1:54323`. First startup downloads Docker images and applies every versioned migration. The setup helper creates 50 sample products, uploads the generated photographs, confirms today's sample rates, and provisions disposable owner/staff/customer accounts. Local account details are in ignored `.local/local-demo-accounts.json`.

The helper writes all local configuration itself. Local AI and Razorpay credentials deliberately reject provider calls. No cloud keys are required for normal UI, database, security, and replay tests. `.next-local` is separate from the cloud-backed development cache and production build output.

In a second terminal:

```sh
python scripts/run-local.py test
python scripts/run-local.py browser
python scripts/run-local.py mcp
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Run database and browser suites sequentially: both exercise disposable stock and rates. Install Chromium once with `npx playwright install chromium`. Linux CI uses `npx playwright install --with-deps chromium`.

To rebuild the **disposable local** database, stop the local app and run `npx supabase db reset`, then `python scripts/setup-local.py`. Reset removes local test/evaluation data; never point reset commands at the hosted project. To stop containers, use `npx supabase stop`.

## Hosted services

`.env.example` lists runtime and provisioning fields. Use a dedicated demo Supabase project, a Gemini free-tier key, and Razorpay **test** keys. Provide values through the environment or an ignored `.env.local`; `scripts/migrate.py` also accepts `DATABASE_URL`. The developer's existing private JSON configuration at `~/.config/rajvya/credentials.json` is an alternative used by provisioning helpers. Never commit that file or publish the owner passwords.

`python scripts/migrate.py` applies missing SQL files using a migration ledger. `python scripts/seed.py` provisions sample Auth, Storage, and database data; it does not reset sold inventory. The generated database types can be refreshed with `python scripts/generate-types.py` using a scoped Supabase management token.

Remote Postgres uses full certificate and hostname verification with Supabase's public CA in `supabase/certs/`. `DATABASE_SSL=disable` is accepted only for loopback databases. Runtime credentials contain only the service capabilities required by the app; GitHub/Vercel/Supabase management tokens are provisioning credentials, not browser configuration.

Confirm all three daily rates in the owner panel before new quotes. Seeding confirms sample rates for the current Kolkata shop day; it does not automatically declare tomorrow's rates valid.

## Live AI evaluation

`scripts/run-local.py` supports `eval`, `judge`, `smoke`, and `index`. `--live-ai` injects a Gemini key from `GEMINI_API_KEY` in the environment, or the existing developer's private configuration, without saving it in the disposable configuration. Index the local catalogue before testing vector search.

```sh
python scripts/run-local.py index --live-ai
python scripts/run-local.py eval --live-ai --limit 30 --record
python scripts/run-local.py eval --live-ai --limit 100 --record
python scripts/run-local.py eval --live-ai --resume .local/latest-eval.json --record
python scripts/run-local.py judge --live-ai .local/release-full-suite.json
python scripts/run-local.py smoke --live-ai
```

Runs stop or record incomplete cases on provider failure. Evaluation pacing does not enable billing or paid fallbacks. The public app has a separate hard daily call cap. Never promote incomplete runs into a passing report.

## Deployment

The requested Vercel team/project are recorded privately in `.local/vercel-project.json`. `python scripts/provision-deploy.py configure` updates the runtime configuration; `deploy` packages Git-included source using ignore rules and secret scanning; `wait` verifies the resulting deployment reaches READY. Production uses Node 22 and the lockfile install command above.

The GitHub workflow runs disposable Postgres tests, recorded model regressions, a complete local Supabase browser suite, and the production build before deploying `main`. An explicit workflow dispatch can run the live 30-case evaluation using the encrypted Gemini repository secret. Provider secrets are not supplied to pull-request verification jobs.

Register the deployed `/api/webhooks/razorpay` URL in the **Razorpay test dashboard**, using the configured webhook secret and `payment.captured`, `payment.failed`, `refund.processed`. API keys alone do not supply dashboard authentication. `python scripts/configure-cron.py` schedules provider reconciliation in Supabase every five minutes; Vault keeps the signing key and queued requests carry only short-lived, one-use signatures. Expiry runs directly in Postgres.
