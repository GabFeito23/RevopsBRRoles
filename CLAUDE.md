# RevOpsBR Roles - Brazilian Revenue Operations Job Board

## Project Overview
A curated Brazilian RevOps job board built with **Next.js** and deployed on **Vercel**. Scrapes, classifies, and stores revenue operations job listings in Neon Postgres. Updated daily via Vercel Cron.

## Tech Stack
- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS**
- **Neon Postgres** (Vercel-integrated) + **Drizzle ORM**
- **Cheerio** for HTML parsing, **fuzzball** for fuzzy dedup
- **Vercel Cron** triggers `/api/cron/scrape` daily at 7am BRT (10:00 UTC)

## User Context
- The user is **non-technical**. All code must work out-of-the-box with minimal setup.
- Setup instructions must be step-by-step, no assumed technical knowledge.
- When errors happen, provide clear human-readable messages with fix instructions.

## Target Roles
RevOps, Sales Ops, CS Ops, GTM Ops, GTM Engineer, Marketing Ops, CRM Admin — all focused on **Brazil**.

## Data Sources (priority order)
1. **Gupy** — Largest Brazilian ATS. Dual approach: API + HTML scraping fallback.
2. **Lever** — Used by international companies with Brazil offices (Cloudwalk, VTEX, etc.)
3. **Greenhouse** — Used by Nubank, Neon, PicPay, XP Inc, and other large fintechs.
4. **LinkedIn** — Via Google Custom Search API. Optional, requires API keys.
5. **Inhire** — Growing Brazilian ATS, HTML scraping of public career pages.
6. **Direct Career Pages** — Best-effort for companies not on any ATS.

## Architecture
- **Frontend**: `app/page.tsx` (Server Component) + `components/job-board.tsx` (Client Component with filters)
- **Cron**: `app/api/cron/scrape/route.ts` — step-chained pattern (one source per step, each gets 60s)
- **Scrapers**: `lib/scraper/sources/*.ts`
- **Classifier**: `lib/classifier/index.ts` — regex-based classification
- **Dedup**: `lib/dedup.ts` — fuzzy matching with fuzzball
- **DB**: `lib/db/schema.ts` (Drizzle) + `lib/db/index.ts` (lazy Neon connection)

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
- `DATABASE_URL` — Auto-set when Neon Postgres is linked
- `CRON_SECRET` — Protects cron endpoint from unauthorized access
- `GUPY_API_TOKEN` — (optional) Gupy JWT Bearer token
- `GOOGLE_CSE_API_KEY` — (optional) Google Custom Search for LinkedIn
- `GOOGLE_CSE_ID` — (optional) Custom Search Engine ID
