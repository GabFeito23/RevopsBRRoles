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
- **Exa AI** for neural web search (job discovery)
- **Vercel Cron** triggers `/api/cron/scrape` daily at 7am BRT (10:00 UTC)

## User Context
- The user is **non-technical**. All code must work out-of-the-box with minimal setup.
- Setup instructions must be step-by-step, no assumed technical knowledge.
- When errors happen, provide clear human-readable messages with fix instructions.

## Target Roles
RevOps, Sales Ops, CS Ops, GTM Ops, GTM Engineer, Marketing Ops, CRM Admin — all focused on **Brazil** (including US/global companies hiring remotely from Brazil/LATAM).

## Data Sources & Scraping Pipeline (9 steps)

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

### Step 3: Jooble API (USA → LATAM remote) — **Active source**
- Uses US Jooble API (`jooble.org/api/`) which works reliably
- Searches for remote RevOps/Sales Ops/CRM roles, then filters for those mentioning Brazil/LATAM
- Keywords include "revops remote LATAM", "revenue operations remote Brazil", etc.
- Only keeps jobs whose title, description, or location mentions Brazil, LATAM, or Latin America
- `JOOBLE_API_KEY` is configured and working

### Step 4: Gupy Batch 2 (33 companies) — **0 jobs currently**
- Same `__NEXT_DATA__` approach as batch 1, larger general companies
- Companies: ambev, itau, btg, totvs, linx, rdstation, vivo, picpay, etc.

### Step 5: Google Custom Search — **Requires API keys**
- Uses Google Custom Search API to discover RevOps jobs across the Brazilian web
- Searches 25+ queries: "revops remoto brasil", "sales ops híbrido", `site:gupy.io revops`, `site:linkedin.com/jobs revops`, etc.
- Auto-discovers new Gupy companies, LinkedIn listings, and jobs on any indexed site
- Requires `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_ID` (free 100 searches/day)
- Parses title/company from Google result snippets, extracts location from text
- Source: `lib/scraper/sources/google-search.ts`

### Step 6: InfoJobs.com.br — **~7-15 jobs**
- Scrapes server-rendered HTML from InfoJobs, one of Brazil's largest job boards
- Searches 9 keywords: revops, revenue operations, sales ops, marketing ops, CRM admin, etc.
- Job cards have `div.js_rowCard[data-id]` structure with title in `h2`, company/location in child divs
- Source: `lib/scraper/sources/infojobs.ts`

### Step 7: Exa AI Search — **~50 jobs found, ~10-25 new after dedup**
- Uses Exa AI's neural search API to discover RevOps jobs across the web
- 10 semantic queries covering: RevOps, Sales Ops, CRM Admin, Marketing Ops, GTM Ops, CS Ops
- Searches both Brazil-based roles AND US/global companies hiring from Brazil/LATAM
- US/global jobs targeting Brazil are automatically forced to **Remoto** work mode by the classifier
- Filters by `startPublishedDate` (last 14 days) to only return recent postings
- Uses Exa's `publishedDate` as `dateFound` — this is the real job posting date, not the scrape date
- Homepage filters by `dateFound >= 15 days ago` to show only genuinely recent jobs
- Discovers jobs on sites other scrapers miss: revopscareers.com, sportstechjobs.com, workingnomads.com, flexionis, himalayas.app, jobgether.com, anchorpoint, remocate.app, ashbyhq.com, etc.
- Targeted domain searches for Gupy and LinkedIn
- Requires `EXA_API_KEY` environment variable
- Source: `lib/scraper/sources/exa-search.ts`

### Step 8: Cleanup
- Marks jobs as "Fechada" if `lastVerified` > 15 days old (STALE_DAYS)

### Removed Sources
- **Inhire** — B2B recruitment SPA software, NOT a job board. No public job listings. Replaced with Gupy batch 2.
- **Career Pages** — Removed per user request. Was scraping RD Station, Conta Azul, Omie career pages via JSON-LD.
- **LinkedIn** — Replaced with Jooble. Requires `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_ID` (optional, not configured).

## Scraping Lessons Learned
- **Gupy portal API is broken** for niche terms. `portal.api.gupy.io/api/job?name=revops` returns 0. But Google indexes hundreds of RevOps jobs on Gupy company subdomains. The working approach is scraping `__NEXT_DATA__` from each company's career page.
- **Most job aggregators are SPAs**: Indeed, Jooble, Glassdoor, Inhire, Workable all render job data via JavaScript. Server-side HTTP scraping gets empty/minimal HTML. Would need a headless browser (Puppeteer/Playwright) to scrape them.
- **Jooble API is US-only but useful**: The BR API is blocked by Cloudflare, but the US API works well for finding remote roles that target Brazil/LATAM candidates. We search globally and filter for LATAM mentions.
- **InfoJobs.com.br is server-rendered** (ASP.NET) and scrapeable with Cheerio. Has 7-15 RevOps jobs. Other BR aggregators (Catho, Vagas.com.br, Remotar) are client-rendered SPAs or have zero RevOps results.
- **Brazilian job aggregator research** (March 2026): Vagas.com.br has Cloudflare + ~0 RevOps jobs. Catho returns 404s (SPA). ProgramaThor is dev-only. Trampos.co has ~1 job. Remotar is client-rendered with no data.
- **Exa AI Search** excels at semantic discovery across the entire web. Found 50+ relevant jobs in first run. Particularly good at finding US/global remote roles targeting Brazil/LATAM that other scrapers miss entirely.

## Architecture
- **Frontend**: `app/page.tsx` (Server Component) + `components/job-board.tsx` (Client Component with filters)
- **Cron**: `app/api/cron/scrape/route.ts` — step-chained pattern (8 source steps + 1 cleanup, 9 total)
- **Scrapers**: `lib/scraper/sources/*.ts` (gupy.ts, lever.ts, greenhouse.ts, jooble.ts, inhire.ts, google-search.ts, infojobs.ts, exa-search.ts)
- **Classifier**: `lib/classifier/index.ts` — regex-based classification with foreign location detection
- **Dedup**: `lib/dedup.ts` — fuzzy matching with fuzzball (85% threshold)
- **DB**: `lib/db/schema.ts` (Drizzle) + `lib/db/index.ts` (lazy Neon connection)
- **Keywords**: `lib/keywords.ts` — two-tier relevance filter (title keywords + description signals)
- **Config**: `lib/config.ts` — company lists, industry mapping, city-state mapping, Exa query configs
- **HTTP**: `lib/scraper/http.ts` — shared fetch with retry, timeout, and delay helpers

## Keyword Matching
- **Tier 1 (title match)**: revops, rev ops, revenue operations, sales ops, salesops, cs ops, csops, customer success ops, gtm ops, marketing ops, mops, crm admin, salesforce admin, hubspot admin, operações comerciais, operações de vendas, operações de receita
- **Tier 2 (broad + description confirmation)**: operations analyst, analista de operações, business operations — requires ≥2 description signals (CRM, Salesforce, HubSpot, funnel, pipeline, automation, dashboard, etc.)
- **Tier 3 (rejection)**: Generic "operações" without qualifiers (comerciais, estratég, dados, receita, vendas, marketing, revenue) is rejected

## Classification Fields
- **Role Category**: RevOps, Sales Ops, CS Ops, GTM Ops, GTM Engineer, Marketing Ops, CRM Admin
- **Seniority**: Estagio, Junior, Pleno, Senior, Especialista, Coordenador, Gerente, Head/Diretor
- **Work Environment**: Remoto, Hibrido, Presencial
  - **Foreign location rule**: Jobs located outside Brazil (US, LATAM, global) that target BR/LATAM candidates are **always classified as Remoto** — you can't be presencial from another country
- **Tech Stack**: Salesforce, HubSpot, Pipedrive, Clay, Zapier, Make, SQL, Tableau, Power BI, RD Station, etc.
- **Contract Type**: CLT, PJ, CLT Flex
- **State**: SP, RJ, MG, PR, SC, RS, BA, DF, CE, PE, GO, ES, Remoto, Other
  - Foreign locations get state "Other" (not "Remoto" — work mode handles that)
- **Industry**: SaaS/Tech, Fintech, E-commerce, Healthtech, Edtech, Consulting, Marketplace, Banking, Other

## Date Filtering
- **`dateFound`** stores the **actual job posting/publication date**, NOT the date we scraped it
- For Exa: uses `publishedDate` from Exa's search results
- For other scrapers: uses today's date (best approximation since those sources only show active jobs)
- **Homepage** filters: `dateFound >= today - 15 days` (STALE_DAYS) to show only recent postings
- **Cleanup step** marks jobs as "Fechada" if `lastVerified > 15 days ago`

## Scheduled Runs
- Daily at 7am BRT via Vercel Cron (`vercel.json`: `0 10 * * *`)
- Step-chained: each source gets its own 60s serverless invocation
- Graceful degradation: if one source fails, others continue
- Pipeline: Step 0 (Gupy) → Step 1 (Lever) → Step 2 (Greenhouse) → Step 3 (Jooble) → Step 4 (Gupy Batch 2) → Step 5 (Google Search) → Step 6 (InfoJobs) → Step 7 (Exa Search) → Step 8 (Cleanup)

## Environment Variables (set in Vercel dashboard)
- `DATABASE_URL` — Auto-set by Neon Postgres integration ✅
- `CRON_SECRET` — Set to `revopsbr-cron-2026-secret` ✅
- `JOOBLE_API_KEY` — Set to `8d91df87-c45b-4d76-b9df-00a7b31b7a0e` ✅ (but API doesn't work for Brazil)
- `EXA_API_KEY` — Set to `7606e30e-4151-41ad-adef-a168f857eefe` ✅ (production + development)
- `GUPY_API_TOKEN` — (optional) Not configured. Gupy portal API is broken anyway.
- `GOOGLE_CSE_API_KEY` — (optional) Not configured. Would unlock Google Search scraper (Step 5) — free 100 searches/day.
- `GOOGLE_CSE_ID` — (optional) Not configured. Create at https://programmablesearchengine.google.com/

## Frontend Filters
- Filters: Categoria (role), Senioridade, Modelo (work mode), Estado
- Search bar: free-text search across title, company, tech stack
- Source and dateFound are NOT shown on job cards (removed for cleaner UI)
- Page revalidates every 1 hour (`revalidate = 3600`)

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
- [x] Google Search scraper built (Step 5) — discovers jobs across all indexed sites
- [x] InfoJobs.com.br scraper built (Step 6) — server-rendered, ~7-15 RevOps jobs
- [x] Brazilian job aggregators researched — InfoJobs is the only viable one without headless browser
- [x] Exa AI Search scraper built (Step 7) — neural search across all job boards, date-filtered
- [x] Exa API key configured in Vercel (production + development)
- [x] Exa scraper tested — 50 jobs found on first run, ~90 total jobs on site
- [x] Foreign location classifier — US/LATAM/global jobs forced to Remoto work mode
- [x] Source filter updated — infojobs, exa, google added to frontend dropdown
- [ ] GitHub-Vercel auto-deploy connection (needs Login Connection in Vercel)
- [ ] Google Custom Search API setup (would unlock Step 5: Google Search scraper)

## Next Steps to Get More Jobs
1. **Set up Google Custom Search API** — Free 100 searches/day. The scraper code is ready (Step 5), just needs `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_ID` configured in Vercel. Create at https://programmablesearchengine.google.com/
2. **Headless browser scraping** — Use Puppeteer/Playwright to scrape Indeed (`br.indeed.com`) and Jooble (`br.jooble.org`) which have 30-60+ Brazilian RevOps jobs but require JS rendering.
3. **More Gupy companies** — Google Search scraper (Step 5) will auto-discover new Gupy companies via `site:gupy.io revops` queries.
