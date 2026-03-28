# RevOpsBR Roles - Brazilian Revenue Operations Job Board

## Project Overview
A curated Brazilian RevOps job board built with **Next.js** and deployed on **Vercel**. Scrapes, classifies, and stores revenue operations job listings in Neon Postgres. Updated daily via Vercel Cron.

## Deployment
- **Live URL**: https://revops-br-job-board.vercel.app
- **Vercel Project**: `revops-br-job-board` (owner: `gabrielaguiarfeitosa-3524s-projects`)
- **GitHub Repo**: https://github.com/GabFeito23/RevopsBRRoles (branch: `main`)
- **Vercel Dashboard**: https://vercel.com/gabrielaguiarfeitosa-3524s-projects/revops-br-job-board

## Tech Stack
- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **Neon Postgres** (Vercel-integrated) + **Drizzle ORM**
- **Cheerio** for HTML parsing, **fuzzball** for fuzzy dedup
- **Vercel Cron** triggers `/api/cron/scrape` daily at 7am BRT (10:00 UTC)

## User Context
- The user is **non-technical**. All code must work out-of-the-box with minimal setup.
- Setup instructions must be step-by-step, no assumed technical knowledge.
- When errors happen, provide clear human-readable messages with fix instructions.

## Target Roles
RevOps, Sales Ops, CS Ops, GTM Ops, GTM Engineer, Marketing Ops, CRM Admin — all focused on **Brazil**.

## Data Sources & Scraping Pipeline (6 steps)

### Step 0: Gupy Batch 1 (25 companies) — **Primary source, ~12 jobs**
- Scrapes `__NEXT_DATA__` JSON from individual company career pages (e.g. `vempra.gupy.io`)
- The Gupy portal API (`portal.api.gupy.io/api/job`) does NOT work for niche RevOps terms — returns 0 results
- Companies: vempra, carreirasomie (Omie), blip, clicksign, logcomex, gedanken, protiviti, mgitech, sejahype, softexpert, takeblip, aegro, lwsa, lumis, cortex, caju, clinicorp, mova, asaas, leads2b, appmax, kamino, grupoboticario, cimed, eduzz

### Step 1: Lever (18 companies) — **0 jobs currently**
- Public JSON API: `https://api.lever.co/v0/postings/{company}`
- Companies: cloudwalk, vtex, creditas, loggi, loft, etc.

### Step 2: Greenhouse (21 companies) — **~5 jobs**
- Public JSON API: `https://boards-api.greenhouse.io/v1/boards/{company}/jobs`
- Companies: nubank, neon, picpay, xpinc, c6bank, appsflyer, etc.

### Step 3: Jooble API — **Not working for Brazil**
- API at `jooble.org/api/` only returns US jobs; Brazilian locations return 0
- `br.jooble.org/api/` returns 403 (Cloudflare blocked)
- The Jooble **website** (`br.jooble.org`) shows 63+ Brazilian RevOps jobs, but data is JS-rendered and not accessible server-side
- `JOOBLE_API_KEY` is configured but useless until Jooble fixes their Brazil API
- **This step should be replaced with Google Custom Search or another working source**

### Step 4: Gupy Batch 2 (33 companies) — **0 jobs currently**
- Same `__NEXT_DATA__` approach as batch 1, larger general companies
- Companies: ambev, itau, btg, totvs, linx, rdstation, vivo, picpay, etc.

### Step 5: Cleanup
- Marks jobs as "Fechada" if `lastVerified` > 7 days old

### Removed Sources
- **Inhire** — B2B recruitment SPA software, NOT a job board. No public job listings. Replaced with Gupy batch 2.
- **Career Pages** — Removed per user request. Was scraping RD Station, Conta Azul, Omie career pages via JSON-LD.
- **LinkedIn** — Replaced with Jooble. Requires `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_ID` (optional, not configured).

## Scraping Lessons Learned
- **Gupy portal API is broken** for niche terms. `portal.api.gupy.io/api/job?name=revops` returns 0. But Google indexes hundreds of RevOps jobs on Gupy company subdomains. The working approach is scraping `__NEXT_DATA__` from each company's career page.
- **Most job aggregators are SPAs**: Indeed, Jooble, Glassdoor, Inhire, Workable all render job data via JavaScript. Server-side HTTP scraping gets empty/minimal HTML. Would need a headless browser (Puppeteer/Playwright) to scrape them.
- **Jooble API is US-only**: Despite `br.jooble.org` showing Brazilian jobs, the REST API only returns US results. The BR subdomain API is blocked by Cloudflare.
- **Best approach for more jobs**: Google Custom Search API (free 100 searches/day) searching `site:gupy.io revops` would discover new companies automatically.

## Architecture
- **Frontend**: `app/page.tsx` (Server Component) + `components/job-board.tsx` (Client Component with filters)
- **Cron**: `app/api/cron/scrape/route.ts` — step-chained pattern (5 source steps + 1 cleanup)
- **Scrapers**: `lib/scraper/sources/*.ts` (gupy.ts, lever.ts, greenhouse.ts, jooble.ts, inhire.ts)
- **Classifier**: `lib/classifier/index.ts` — regex-based classification
- **Dedup**: `lib/dedup.ts` — fuzzy matching with fuzzball
- **DB**: `lib/db/schema.ts` (Drizzle) + `lib/db/index.ts` (lazy Neon connection)
- **Keywords**: `lib/keywords.ts` — two-tier relevance filter (title keywords + description signals)
- **Config**: `lib/config.ts` — company lists, industry mapping, city-state mapping

## Keyword Matching
- **Tier 1 (title match)**: revops, rev ops, revenue operations, sales ops, salesops, cs ops, csops, customer success ops, gtm ops, marketing ops, mops, crm admin, salesforce admin, hubspot admin, operações comerciais, operações de vendas, operações de receita
- **Tier 2 (broad + description confirmation)**: operations analyst, analista de operações, business operations — requires ≥2 description signals (CRM, Salesforce, HubSpot, funnel, pipeline, automation, dashboard, etc.)

## Classification Fields
- **Role Category**: RevOps, Sales Ops, CS Ops, GTM Ops, GTM Engineer, Marketing Ops, CRM Admin
- **Seniority**: Estagio, Junior, Pleno, Senior, Especialista, Coordenador, Gerente, Head/Diretor
- **Work Environment**: Remoto, Hibrido, Presencial
- **Tech Stack**: Salesforce, HubSpot, Pipedrive, Clay, Zapier, Make, SQL, Tableau, Power BI, RD Station, etc.
- **Contract Type**: CLT, PJ, CLT Flex
- **State**: SP, RJ, MG, PR, SC, RS, BA, DF, CE, PE, GO, ES, Other
- **Industry**: SaaS/Tech, Fintech, E-commerce, Healthtech, Edtech, Consulting, Marketplace, Banking, Other

## Scheduled Runs
- Daily at 7am BRT via Vercel Cron (`vercel.json`: `0 10 * * *`)
- Step-chained: each source gets its own 60s serverless invocation
- Graceful degradation: if one source fails, others continue

## Environment Variables (set in Vercel dashboard)
- `DATABASE_URL` — Auto-set by Neon Postgres integration ✅
- `CRON_SECRET` — Set to `revopsbr-cron-2026-secret` ✅
- `JOOBLE_API_KEY` — Set to `8d91df87-c45b-4d76-b9df-00a7b31b7a0e` ✅ (but API doesn't work for Brazil)
- `GUPY_API_TOKEN` — (optional) Not configured. Gupy portal API is broken anyway.
- `GOOGLE_CSE_API_KEY` — (optional) Not configured. Would unlock Google search-based job discovery.
- `GOOGLE_CSE_ID` — (optional) Not configured.

## Setup Status
- [x] Next.js app built and compiling
- [x] Deployed to Vercel (production)
- [x] GitHub repo created and synced
- [x] CRON_SECRET configured
- [x] Neon Postgres database connected via Vercel Storage
- [x] Database schema pushed (`drizzle-kit push`)
- [x] First scrape triggered (~17 jobs from Gupy + Greenhouse)
- [x] Gupy scraper rewritten (portal API → __NEXT_DATA__ from company pages)
- [x] Inhire replaced (B2B software, not a job board)
- [x] Career pages removed
- [x] Jooble API added (but doesn't work for Brazil)
- [ ] GitHub-Vercel auto-deploy connection (needs Login Connection in Vercel)
- [ ] Google Custom Search API setup (would discover new Gupy companies automatically)

## Next Steps to Get More Jobs
1. **Google Custom Search API** — Free 100 searches/day. Search `site:gupy.io revops` to auto-discover new companies. This is the highest-impact next step.
2. **Headless browser scraping** — Use Puppeteer/Playwright to scrape Indeed (`br.indeed.com`) and Jooble (`br.jooble.org`) which have 30-60+ Brazilian RevOps jobs but require JS rendering.
3. **More Gupy companies** — Continuously discover and add new company subdomains.
