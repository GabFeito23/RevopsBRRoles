# RevOpsBR Roles - Brazilian Revenue Operations Job Board

## Project Overview
A curated Brazilian RevOps job repository that scrapes, classifies, and stores revenue operations job listings in Airtable. Updated daily via Claude Code scheduled trigger.

## User Context
- The user is **non-technical**. All code must work out-of-the-box with minimal setup.
- Setup instructions must be step-by-step, no assumed technical knowledge.
- When errors happen, provide clear human-readable messages with fix instructions.

## Target Roles
RevOps, Sales Ops, CS Ops, GTM Ops, GTM Engineer, Marketing Ops, CRM Admin — all focused on **Brazil**.

## Data Sources (priority order)
1. **Gupy** — Largest Brazilian ATS. Dual approach: API (when token available) + HTML scraping fallback. Covers ~60% of Brazilian tech company jobs.
2. **Lever** — Used by international companies with Brazil offices (Cloudwalk, VTEX, etc.)
3. **Greenhouse** — Used by Nubank, Neon, PicPay, XP Inc, and other large fintechs.
4. **LinkedIn** — Via Google Custom Search API. Supplemental source for roles not on ATS platforms.
5. **Inhire** — Growing Brazilian ATS, HTML scraping of public career pages.
6. **Direct Career Pages** — Best-effort for companies not on any ATS.

## Data Storage
- **Airtable** as database + public-facing view (the "website")
- Table: "Jobs" with fields for classification (seniority, tech stack, work environment, etc.)
- Public shared view = the job board visitors see

## Classification Fields
- **Role Category**: RevOps, Sales Ops, CS Ops, GTM Ops, GTM Engineer, Marketing Ops, CRM Admin
- **Seniority**: Estagio, Junior, Pleno, Senior, Especialista, Coordenador, Gerente, Head/Diretor
- **Work Environment**: Remoto, Hibrido, Presencial
- **Tech Stack**: Salesforce, HubSpot, Pipedrive, Clay, Zapier, Make, SQL, Tableau, Power BI, RD Station, etc.
- **Contract Type**: CLT, PJ, CLT Flex
- **State**: SP, RJ, MG, PR, SC, RS, BA, DF, CE, PE, GO, ES, Other
- **Industry**: SaaS/Tech, Fintech, E-commerce, Healthtech, Edtech, Consulting, Marketplace, Banking, Other

## Accuracy & Coverage Strategy
- Two-tier keyword filtering: title match + description signal keywords to avoid false positives
- Cross-source deduplication by company+title fuzzy matching
- Staleness detection: jobs not found in re-scrape are marked "Fechada"
- All application URLs are validated before storing
- Search in both Portuguese and English (many BR companies post bilingual listings)

## Scheduled Runs
- Daily at 7am BRT via Claude Code scheduled trigger
- Run: `python main.py`
- Graceful degradation: if one source fails, others continue
- Logs summary: X new, Y updated, Z closed

## Environment Variables
- `AIRTABLE_API_KEY` — Airtable Personal Access Token
- `AIRTABLE_BASE_ID` — Airtable Base ID (starts with app...)
- `GUPY_API_TOKEN` — (optional) Gupy JWT Bearer token
- `GOOGLE_CSE_API_KEY` — (optional) Google Custom Search for LinkedIn
- `GOOGLE_CSE_ID` — (optional) Custom Search Engine ID
