# AGENTS.md

## Project

Pixel Perfect is the Phase 1 ECCO hotel affiliate source. It is a Cloudflare Pages/Hono app backed by D1 and R2, with Travelpayouts hotel search, cached hotel data, map markers, affiliate links, AI chat, alerts, bookings, Stripe, and Whop integrations.

## Workflow Rule

After every code or docs change, finish with a GitHub commit and push. Do not stop after local verification.

Required flow:

1. Inspect the repo and current branch.
2. Make the requested changes only.
3. Run relevant checks:
   - `npm run build`, if available
   - `npm run db:migrate:local`, when database changes are involved
   - smoke checks for changed endpoints when possible
4. Remove temp files, local tokens, logs, and generated junk before committing.
5. Run `git status` and `git diff --stat`.
6. Commit with a clear message.
7. Push to GitHub.

Never commit secrets, `.env`, `.dev.vars`, API keys, Wrangler temp logs, tokens, or local-only files.

## ECCO Integration Rules

- Keep MCP endpoints private behind `PRIVATE_GATEWAY_TOKEN`.
- Do not expose `/api/admin/*`, `/api/ingest`, `/api/webhook/*`, Stripe, Whop, checkout, write, or delete routes through MCP.
- Use real Travelpayouts API data or D1 cached hotel data only.
- Do not present random/mock Booking.com, Expedia, Hotels.com, or hotel prices as real.
- Do not invent hotel prices, coordinates, testimonials, availability, or booking data.
- Keep Phase 1 tools read/generate only. Click tracking should be dry-run until explicitly approved.

## Current MCP Surface

- `GET /mcp/manifest`
- `GET /mcp/tools`
- `POST /mcp/call`

Initial tools:

- `hotels.search_hotels`
- `hotels.get_affiliate_links`
- `hotels.get_map_markers`
- `hotels.track_affiliate_click`
