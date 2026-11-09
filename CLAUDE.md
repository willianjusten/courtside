## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for willianjusten/nba-nextjs, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Architecture

Follows Bulletproof React's layout inside `src/`, with one-way imports: shared → features → app. `.oxlintrc.json` enforces the boundaries (tests are exempt).

- `src/app/`: routes only (pages, `/api` route handlers, Open Graph images) and the composition of features. Keep route files thin.
- `src/features/<feature>/`: `favorites`, `game`, `navigation`, `scoreboard`, `standings`, `teams`. Each holds `api/` (TanStack Query options and hooks, with `server.ts` pairing them with the server loaders), `components/`, and `utils/` (view models such as `*-view.ts`). A feature imports only itself and shared code. When two features need something, move it to shared code, or compose them in `src/app`.
- Shared code:
  - `src/api/`: queries used by several features (scoreboard, teams, standings, leaders), plus `server.ts`.
  - `src/components/`: `ui/` primitives, `layouts/` (the header takes its feature content as slots), and shared domain UI such as `LeadersPanel`.
  - `src/lib/`: `espn/` (fetching and mapping ESPN), `server/` (memory cache, loaders, JSON route helper), `react-query/`, `share-image/`, and `live-polling/`.
  - `src/stores/favorites/`: followed teams.
  - `src/types/`: the app's domain types.
  - `src/utils/`: pure helpers (dates, seasons, team colors, standings rules).
  - `src/hooks/`, `src/config/` (`strings`, theme colors), and `src/testing/`.
- Import files directly; there are no barrel files.

## Caching (read before touching data fetching)

Never use ISR or the Data Cache (`next.revalidate`, `export const revalidate`, `"use cache"`, `unstable_cache`); Vercel bills their writes and they ate the free tier. Cache on the server with `memoryCached` (TTLs in `src/lib/server/loaders.ts`) and in the browser through CDN-cached `/api` routes. See `docs/adr/0001-no-isr-memory-and-cdn-caching.md`.
