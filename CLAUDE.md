## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for willianjusten/nba-nextjs, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Architecture

- `app/`: routes only (pages, `/api` route handlers, Open Graph images). Keep them thin.
- `features/<feature>/`: one slice per product area (`scoreboard`, `game`, `standings`, `leaders`, `teams`, `favorites`, `shell`), each with `components/`, view-model logic (`*-view.ts`), and `queries/`. In `queries/`, the client query options read `/api` or ESPN, and `server.ts` pairs the same query keys with the server loaders for prefetching.
- `lib/`: shared code. `espn/` fetches and maps ESPN, `domain/` holds the app's types, `server/` holds the memory cache, loaders, and JSON route helper, and `query/` holds the TanStack Query clients.
- `components/`: UI shared by several features.

## Caching (read before touching data fetching)

Never use ISR or the Data Cache (`next.revalidate`, `export const revalidate`, `"use cache"`, `unstable_cache`); Vercel bills their writes and they ate the free tier. Cache on the server with `memoryCached` (TTLs in `lib/server/loaders.ts`) and in the browser through CDN-cached `/api` routes. See `docs/adr/0001-no-isr-memory-and-cdn-caching.md`.
